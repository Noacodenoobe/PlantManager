import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq, like, and, sql } from 'drizzle-orm';
import { locations, plants, users, type Location, type Plant, type InsertLocation, type InsertPlant, type LocationWithPath, type PlantWithLocation } from '../shared/schema';

export interface IStorage {
  // Locations
  getAllLocations(): Promise<Location[]>;
  getLocationById(id: number): Promise<Location | undefined>;
  getLocationsByParentId(parentId: number | null): Promise<Location[]>;
  getLocationsByLevel(level: number): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  getLocationHierarchy(): Promise<LocationWithPath[]>;
  
  // Plants
  getAllPlants(): Promise<PlantWithLocation[]>;
  getPlantById(id: string): Promise<PlantWithLocation | undefined>;
  searchPlants(query: string): Promise<PlantWithLocation[]>;
  filterPlants(filters: { status?: string; locationId?: number }): Promise<PlantWithLocation[]>;
  createPlant(plant: InsertPlant): Promise<Plant>;
  updatePlant(id: string, updates: Partial<InsertPlant>): Promise<Plant>;
  deletePlant(id: string): Promise<boolean>;
  
  // Users
  getUserByEmail(email: string): Promise<typeof users.$inferSelect | undefined>;
  createUser(user: { email: string; passwordHash: string }): Promise<typeof users.$inferSelect>;
  
  // Import
  importCSVData(csvData: any[]): Promise<void>;
}

export class SQLiteStorage implements IStorage {
  private db: Database.Database;
  private drizzle: ReturnType<typeof drizzle>;

  constructor(dbPath: string = 'database.db') {
    this.db = new Database(dbPath);
    this.drizzle = drizzle(this.db);
    this.setupDatabase();
  }

  private setupDatabase() {
    // Tworzenie tabel
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        level INTEGER NOT NULL,
        parent_id INTEGER,
        FOREIGN KEY (parent_id) REFERENCES locations(id) ON DELETE CASCADE
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS plants (
        id TEXT PRIMARY KEY,
        species TEXT NOT NULL,
        location_id INTEGER,
        status TEXT NOT NULL DEFAULT 'Zdrowa',
        notes TEXT,
        FOREIGN KEY (location_id) REFERENCES locations(id)
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL
      );
    `);

    // Indeksy dla lepszej wydajności
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_locations_parent_id ON locations(parent_id);
      CREATE INDEX IF NOT EXISTS idx_locations_level ON locations(level);
      CREATE INDEX IF NOT EXISTS idx_plants_location_id ON plants(location_id);
      CREATE INDEX IF NOT EXISTS idx_plants_status ON plants(status);
    `);
  }

  // Locations
  async getAllLocations(): Promise<Location[]> {
    return this.drizzle.select().from(locations);
  }

  async getLocationById(id: number): Promise<Location | undefined> {
    const result = await this.drizzle.select().from(locations).where(eq(locations.id, id));
    return result[0];
  }

  async getLocationsByParentId(parentId: number | null): Promise<Location[]> {
    if (parentId === null) {
      return this.drizzle.select().from(locations).where(sql`${locations.parentId} IS NULL`);
    }
    return this.drizzle.select().from(locations).where(eq(locations.parentId, parentId));
  }

  async getLocationsByLevel(level: number): Promise<Location[]> {
    return this.drizzle.select().from(locations).where(eq(locations.level, level));
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const result = await this.drizzle.insert(locations).values(location).returning();
    return result[0];
  }

  async getLocationHierarchy(): Promise<LocationWithPath[]> {
    const allLocations = await this.getAllLocations();
    const locationMap = new Map<number, LocationWithPath>();
    
    // Konwertuj wszystkie lokalizacje do LocationWithPath
    allLocations.forEach(location => {
      locationMap.set(location.id, {
        ...location,
        fullPath: '',
        children: []
      });
    });

    // Buduj hierarchię i pełne ścieżki
    const rootLocations: LocationWithPath[] = [];
    
    allLocations.forEach(location => {
      const locationWithPath = locationMap.get(location.id)!;
      
      if (location.parentId === null) {
        locationWithPath.fullPath = location.name;
        rootLocations.push(locationWithPath);
      } else {
        const parent = locationMap.get(location.parentId);
        if (parent) {
          locationWithPath.fullPath = `${parent.fullPath} > ${location.name}`;
          parent.children!.push(locationWithPath);
        }
      }
    });

    return rootLocations;
  }

  // Plants
  async getAllPlants(): Promise<PlantWithLocation[]> {
    const result = await this.drizzle
      .select({
        id: plants.id,
        species: plants.species,
        locationId: plants.locationId,
        status: plants.status,
        notes: plants.notes,
        locationName: locations.name,
      })
      .from(plants)
      .leftJoin(locations, eq(plants.locationId, locations.id));

    return result.map(row => ({
      id: row.id,
      species: row.species,
      locationId: row.locationId,
      status: row.status,
      notes: row.notes,
      location: row.locationName ? {
        id: row.locationId!,
        name: row.locationName,
        level: 0,
        parentId: null,
        fullPath: row.locationName
      } : undefined
    }));
  }

  async getPlantById(id: string): Promise<PlantWithLocation | undefined> {
    const result = await this.drizzle
      .select({
        id: plants.id,
        species: plants.species,
        locationId: plants.locationId,
        status: plants.status,
        notes: plants.notes,
        locationName: locations.name,
      })
      .from(plants)
      .leftJoin(locations, eq(plants.locationId, locations.id))
      .where(eq(plants.id, id));

    if (result.length === 0) return undefined;

    const row = result[0];
    return {
      id: row.id,
      species: row.species,
      locationId: row.locationId,
      status: row.status,
      notes: row.notes,
      location: row.locationName ? {
        id: row.locationId!,
        name: row.locationName,
        level: 0,
        parentId: null,
        fullPath: row.locationName
      } : undefined
    };
  }

  async searchPlants(query: string): Promise<PlantWithLocation[]> {
    const searchPattern = `%${query}%`;
    const result = await this.drizzle
      .select({
        id: plants.id,
        species: plants.species,
        locationId: plants.locationId,
        status: plants.status,
        notes: plants.notes,
        locationName: locations.name,
      })
      .from(plants)
      .leftJoin(locations, eq(plants.locationId, locations.id))
      .where(
        sql`${plants.id} LIKE ${searchPattern} OR ${plants.species} LIKE ${searchPattern}`
      );

    return result.map(row => ({
      id: row.id,
      species: row.species,
      locationId: row.locationId,
      status: row.status,
      notes: row.notes,
      location: row.locationName ? {
        id: row.locationId!,
        name: row.locationName,
        level: 0,
        parentId: null,
        fullPath: row.locationName
      } : undefined
    }));
  }

  async filterPlants(filters: { status?: string; locationId?: number }): Promise<PlantWithLocation[]> {
    let query = this.drizzle
      .select({
        id: plants.id,
        species: plants.species,
        locationId: plants.locationId,
        status: plants.status,
        notes: plants.notes,
        locationName: locations.name,
      })
      .from(plants)
      .leftJoin(locations, eq(plants.locationId, locations.id));

    const conditions = [];
    if (filters.status) {
      conditions.push(eq(plants.status, filters.status));
    }
    if (filters.locationId) {
      conditions.push(eq(plants.locationId, filters.locationId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query;

    return result.map(row => ({
      id: row.id,
      species: row.species,
      locationId: row.locationId,
      status: row.status,
      notes: row.notes,
      location: row.locationName ? {
        id: row.locationId!,
        name: row.locationName,
        level: 0,
        parentId: null,
        fullPath: row.locationName
      } : undefined
    }));
  }

  async createPlant(plant: InsertPlant): Promise<Plant> {
    const result = await this.drizzle.insert(plants).values(plant).returning();
    return result[0];
  }

  async updatePlant(id: string, updates: Partial<InsertPlant>): Promise<Plant> {
    const result = await this.drizzle.update(plants).set(updates).where(eq(plants.id, id)).returning();
    return result[0];
  }

  async deletePlant(id: string): Promise<boolean> {
    const result = await this.drizzle.delete(plants).where(eq(plants.id, id));
    return result.changes > 0;
  }

  // Users
  async getUserByEmail(email: string): Promise<typeof users.$inferSelect | undefined> {
    const result = await this.drizzle.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(user: { email: string; passwordHash: string }): Promise<typeof users.$inferSelect> {
    const result = await this.drizzle.insert(users).values(user).returning();
    return result[0];
  }

  // Import CSV data
  async importCSVData(csvData: any[]): Promise<void> {
    const transaction = this.db.transaction(() => {
      // Mapa do śledzenia utworzonych lokalizacji
      const locationCache = new Map<string, number>();

      csvData.forEach(row => {
        // Poziomy lokalizacji z pliku CSV
        const locationLevels = [
          { name: row.Pietro, level: 1 },
          { name: row.Strefa_glowna, level: 2 },
          { name: row.Lokalizacja_szczegolowa, level: 3 },
          { name: row.Rodzaj_donicy, level: 4 },
          { name: row.Lokalizacja_precyzyjna, level: 5 }
        ].filter(loc => loc.name && loc.name.trim() !== ''); // Filtruj puste wartości

        let parentId: number | null = null;
        let currentLocationId: number | null = null;

        // Twórz hierarchię lokalizacji
        locationLevels.forEach((levelData, index) => {
          const pathKey = locationLevels.slice(0, index + 1).map(l => l.name).join(' > ');
          
          if (!locationCache.has(pathKey)) {
            const newLocation = this.drizzle.insert(locations).values({
              name: levelData.name,
              level: levelData.level,
              parentId: parentId
            }).returning().get();
            
            locationCache.set(pathKey, newLocation.id);
            currentLocationId = newLocation.id;
          } else {
            currentLocationId = locationCache.get(pathKey)!;
          }
          
          parentId = currentLocationId;
        });

        // Dodaj roślinę
        if (row.ID_Rosliny && row.Roslina) {
          this.drizzle.insert(plants).values({
            id: row.ID_Rosliny,
            species: row.Roslina,
            locationId: currentLocationId,
            status: 'Zdrowa',
            notes: null
          }).run();
        }
      });
    });

    transaction();
  }
}