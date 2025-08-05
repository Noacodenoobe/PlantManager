import express from 'express';
import Database from 'better-sqlite3';
import multer from 'multer';
import Papa from 'papaparse';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Initialize SQLite database
const db = new Database('database.db');

// Create tables with new structure
db.exec(`
  CREATE TABLE IF NOT EXISTS zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    floor TEXT NOT NULL,
    main_zone TEXT NOT NULL,
    sub_zone TEXT,
    area_type TEXT,
    specific_location TEXT,
    full_path TEXT NOT NULL UNIQUE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS plants (
    id TEXT PRIMARY KEY,
    species TEXT NOT NULL,
    zone_id INTEGER,
    status TEXT NOT NULL DEFAULT 'Zdrowa',
    notes TEXT,
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL
  );
`);

// Middleware
app.use(express.json());
app.use(express.static('dist'));

const upload = multer({ storage: multer.memoryStorage() });

// Helper function to create or get zone
const getOrCreateZone = (floor, mainZone, subZone, areaType, specificLocation) => {
  const fullPath = [floor, mainZone, subZone, areaType, specificLocation]
    .filter(Boolean)
    .join(' > ');
  
  let zone = db.prepare('SELECT * FROM zones WHERE full_path = ?').get(fullPath);
  
  if (!zone) {
    const stmt = db.prepare(`
      INSERT INTO zones (floor, main_zone, sub_zone, area_type, specific_location, full_path)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(floor, mainZone, subZone, areaType, specificLocation, fullPath);
    zone = {
      id: result.lastInsertRowid,
      floor,
      main_zone: mainZone,
      sub_zone: subZone,
      area_type: areaType,
      specific_location: specificLocation,
      full_path: fullPath
    };
  }
  
  return zone;
};

// API Routes
app.get('/api/plants', (req, res) => {
  try {
    const { search, status, zoneId, floor, mainZone, subZone } = req.query;
    let query = `
      SELECT p.*, z.full_path as zone_path
      FROM plants p 
      LEFT JOIN zones z ON p.zone_id = z.id
    `;
    
    const conditions = [];
    const params = [];
    
    if (search) {
      conditions.push('(p.id LIKE ? OR p.species LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }
    
    if (zoneId) {
      conditions.push('p.zone_id = ?');
      params.push(zoneId);
    }
    
    // Hierarchical filtering
    if (floor) {
      conditions.push('z.floor = ?');
      params.push(floor);
    }
    
    if (mainZone) {
      conditions.push('z.main_zone = ?');
      params.push(mainZone);
    }
    
    if (subZone) {
      conditions.push('z.sub_zone = ?');
      params.push(subZone);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    const stmt = db.prepare(query);
    const plants = stmt.all(...params);
    
    const result = plants.map(plant => ({
      id: plant.id,
      species: plant.species,
      zoneId: plant.zone_id,
      status: plant.status,
      notes: plant.notes,
      zone: plant.zone_id ? {
        id: plant.zone_id,
        fullPath: plant.zone_path
      } : undefined
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching plants:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania roślin' });
  }
});

app.get('/api/zones', (req, res) => {
  try {
    const { floor, mainZone, subZone } = req.query;
    let query = 'SELECT * FROM zones';
    const params = [];
    
    if (floor) {
      query += ' WHERE floor = ?';
      params.push(floor);
    } else if (mainZone) {
      query += ' WHERE main_zone = ?';
      params.push(mainZone);
    } else if (subZone) {
      query += ' WHERE sub_zone = ?';
      params.push(subZone);
    }
    
    const stmt = db.prepare(query);
    const zones = stmt.all(...params);
    
    res.json(zones);
  } catch (error) {
    console.error('Error fetching zones:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania stref' });
  }
});

// New endpoints for hierarchical filtering
app.get('/api/floors', (req, res) => {
  try {
    const stmt = db.prepare('SELECT DISTINCT floor FROM zones ORDER BY floor');
    const floors = stmt.all();
    res.json(floors.map(f => f.floor));
  } catch (error) {
    console.error('Error fetching floors:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania pięter' });
  }
});

app.get('/api/main-zones', (req, res) => {
  try {
    const { floor } = req.query;
    let query = 'SELECT DISTINCT main_zone FROM zones';
    const params = [];
    
    if (floor) {
      query += ' WHERE floor = ?';
      params.push(floor);
    }
    
    query += ' ORDER BY main_zone';
    const stmt = db.prepare(query);
    const mainZones = stmt.all(...params);
    res.json(mainZones.map(z => z.main_zone));
  } catch (error) {
    console.error('Error fetching main zones:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania stref głównych' });
  }
});

app.get('/api/sub-zones', (req, res) => {
  try {
    const { floor, mainZone } = req.query;
    let query = 'SELECT DISTINCT sub_zone FROM zones';
    const params = [];
    
    if (floor && mainZone) {
      query += ' WHERE floor = ? AND main_zone = ?';
      params.push(floor, mainZone);
    } else if (floor) {
      query += ' WHERE floor = ?';
      params.push(floor);
    } else if (mainZone) {
      query += ' WHERE main_zone = ?';
      params.push(mainZone);
    }
    
    query += ' ORDER BY sub_zone';
    const stmt = db.prepare(query);
    const subZones = stmt.all(...params);
    res.json(subZones.map(z => z.sub_zone));
  } catch (error) {
    console.error('Error fetching sub zones:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania podstref' });
  }
});

app.post('/api/plants', (req, res) => {
  try {
    const { id, species, zoneId, status, notes } = req.body;
    
    if (!id || !species) {
      return res.status(400).json({ error: 'ID i gatunek są wymagane' });
    }
    
    const stmt = db.prepare(`
      INSERT INTO plants (id, species, zone_id, status, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, species, zoneId || null, status || 'Zdrowa', notes || null);
    
    res.status(201).json({ id, species, zoneId, status, notes });
  } catch (error) {
    console.error('Error creating plant:', error);
    res.status(500).json({ error: 'Błąd podczas tworzenia rośliny' });
  }
});

app.patch('/api/plants/:id', (req, res) => {
  try {
    const id = req.params.id;
    const { species, zoneId, status, notes } = req.body;
    
    const updates = [];
    const values = [];
    
    if (species !== undefined) {
      updates.push('species = ?');
      values.push(species);
    }
    
    if (zoneId !== undefined) {
      updates.push('zone_id = ?');
      values.push(zoneId);
    }
    
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Brak danych do aktualizacji' });
    }
    
    values.push(id);
    
    const stmt = db.prepare(`UPDATE plants SET ${updates.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Roślina nie została znaleziona' });
    }
    
    const plant = db.prepare('SELECT * FROM plants WHERE id = ?').get(id);
    res.json(plant);
  } catch (error) {
    console.error('Error updating plant:', error);
    res.status(500).json({ error: 'Błąd podczas aktualizacji rośliny' });
  }
});

app.delete('/api/plants/:id', (req, res) => {
  try {
    const id = req.params.id;
    const stmt = db.prepare('DELETE FROM plants WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Roślina nie została znaleziona' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting plant:', error);
    res.status(500).json({ error: 'Błąd podczas usuwania rośliny' });
  }
});

app.post('/api/import-csv', upload.single('csvFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nie przesłano pliku CSV' });
    }

    const csvText = req.file.buffer.toString('utf-8');
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
      return res.status(400).json({ 
        error: 'Błąd podczas parsowania pliku CSV', 
        details: parseResult.errors 
      });
    }

    let importedCount = 0;
    const errors = [];

    const transaction = db.transaction(() => {
      parseResult.data.forEach((row, index) => {
        try {
          // Extract zone information from CSV
          const floor = row.Pietro || row['Piętro'] || '';
          const mainZone = row.Strefa_glowna || row['Strefa główna'] || '';
          const subZone = row.Lokalizacja_szczegolowa || row['Lokalizacja szczegółowa'] || '';
          const areaType = row.Rodzaj_donicy || row['Rodzaj donicy'] || '';
          const specificLocation = row.Lokalizacja_precyzyjna || row['Lokalizacja precyzyjna'] || '';
          
          // Create or get zone
          const zone = getOrCreateZone(floor, mainZone, subZone, areaType, specificLocation);
          
          // Add plant
          const plantId = row.ID_Rosliny || row['ID Rośliny'] || row['ID_Rośliny'];
          const species = row.Roslina || row['Roślina'];
          
          if (plantId && species) {
            const stmt = db.prepare(`
              INSERT OR REPLACE INTO plants (id, species, zone_id, status, notes)
              VALUES (?, ?, ?, ?, ?)
            `);
            stmt.run(plantId, species, zone.id, 'Zdrowa', null);
            importedCount++;
          }
        } catch (error) {
          errors.push(`Row ${index + 1}: ${error.message}`);
        }
      });
    });

    transaction();

    res.json({
      success: true,
      message: `Zaimportowano ${importedCount} roślin`,
      importedRecords: importedCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error importing CSV:', error);
    res.status(500).json({ error: 'Błąd podczas importu CSV' });
  }
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});