const express = require('express');
const Database = require('better-sqlite3');
const multer = require('multer');
const Papa = require('papaparse');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Initialize SQLite database
const db = new Database('database.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    level INTEGER NOT NULL,
    parent_id INTEGER,
    FOREIGN KEY (parent_id) REFERENCES locations(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS plants (
    id TEXT PRIMARY KEY,
    species TEXT NOT NULL,
    location_id INTEGER,
    status TEXT NOT NULL DEFAULT 'Zdrowa',
    notes TEXT,
    FOREIGN KEY (location_id) REFERENCES locations(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  );
`);

// Middleware
app.use(express.json());
app.use(express.static('dist'));

const upload = multer({ storage: multer.memoryStorage() });

// API Routes
app.get('/api/plants', (req, res) => {
  try {
    const { search, status, locationId } = req.query;
    let query = `
      SELECT p.*, l.name as location_name 
      FROM plants p 
      LEFT JOIN locations l ON p.location_id = l.id
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
    
    if (locationId) {
      conditions.push('p.location_id = ?');
      params.push(locationId);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    const stmt = db.prepare(query);
    const plants = stmt.all(...params);
    
    const result = plants.map(plant => ({
      id: plant.id,
      species: plant.species,
      locationId: plant.location_id,
      status: plant.status,
      notes: plant.notes,
      location: plant.location_name ? {
        id: plant.location_id,
        name: plant.location_name,
        fullPath: plant.location_name
      } : undefined
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching plants:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania roślin' });
  }
});

app.get('/api/locations', (req, res) => {
  try {
    const { level, parentId } = req.query;
    let query = 'SELECT * FROM locations';
    const params = [];
    
    if (level) {
      query += ' WHERE level = ?';
      params.push(level);
    } else if (parentId !== undefined) {
      if (parentId === 'null') {
        query += ' WHERE parent_id IS NULL';
      } else {
        query += ' WHERE parent_id = ?';
        params.push(parentId);
      }
    }
    
    const stmt = db.prepare(query);
    const locations = stmt.all(...params);
    res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania lokalizacji' });
  }
});

app.post('/api/plants', (req, res) => {
  try {
    const { id, species, locationId, status, notes } = req.body;
    
    if (!id || !species) {
      return res.status(400).json({ error: 'ID i gatunek są wymagane' });
    }
    
    const stmt = db.prepare(`
      INSERT INTO plants (id, species, location_id, status, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, species, locationId || null, status || 'Zdrowa', notes || null);
    
    res.status(201).json({ id, species, locationId, status, notes });
  } catch (error) {
    console.error('Error creating plant:', error);
    res.status(500).json({ error: 'Błąd podczas tworzenia rośliny' });
  }
});

app.patch('/api/plants/*', (req, res) => {
  try {
    const id = req.url.split('/').pop();
    const updates = req.body;
    
    const fields = [];
    const values = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'locationId') {
        fields.push('location_id = ?');
      } else {
        fields.push(`${key} = ?`);
      }
      values.push(value);
    });
    
    values.push(id);
    
    const stmt = db.prepare(`UPDATE plants SET ${fields.join(', ')} WHERE id = ?`);
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

app.delete('/api/plants/*', (req, res) => {
  try {
    const id = req.url.split('/').pop();
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

    // Import logic (simplified)
    const transaction = db.transaction(() => {
      const locationCache = new Map();
      
      parseResult.data.forEach(row => {
        // Create locations hierarchy
        const locationLevels = [
          { name: row.Pietro || row['Piętro'], level: 1 },
          { name: row.Strefa_glowna || row['Strefa główna'], level: 2 },
          { name: row.Lokalizacja_szczegolowa || row['Lokalizacja szczegółowa'], level: 3 },
          { name: row.Rodzaj_donicy || row['Rodzaj donicy'], level: 4 },
          { name: row.Lokalizacja_precyzyjna || row['Lokalizacja precyzyjna'], level: 5 }
        ].filter(loc => loc.name && loc.name.trim() !== '');

        let parentId = null;
        let currentLocationId = null;

        locationLevels.forEach((levelData, index) => {
          const pathKey = locationLevels.slice(0, index + 1).map(l => l.name).join(' > ');
          
          if (!locationCache.has(pathKey)) {
            const stmt = db.prepare(`
              INSERT INTO locations (name, level, parent_id)
              VALUES (?, ?, ?)
            `);
            const result = stmt.run(levelData.name, levelData.level, parentId);
            locationCache.set(pathKey, result.lastInsertRowid);
            currentLocationId = result.lastInsertRowid;
          } else {
            currentLocationId = locationCache.get(pathKey);
          }
          
          parentId = currentLocationId;
        });

        // Add plant
        const plantId = row.ID_Rosliny || row['ID Rośliny'] || row['ID_Rośliny'];
        const species = row.Roslina || row['Roślina'];
        
        if (plantId && species) {
          try {
            const stmt = db.prepare(`
              INSERT OR REPLACE INTO plants (id, species, location_id, status, notes)
              VALUES (?, ?, ?, ?, ?)
            `);
            stmt.run(plantId, species, currentLocationId, 'Zdrowa', null);
          } catch (e) {
            console.log('Error inserting plant:', plantId, e.message);
          }
        }
      });
    });

    transaction();
    
    res.json({ 
      message: 'Pomyślnie zaimportowano dane z pliku CSV',
      importedRecords: parseResult.data.length
    });
  } catch (error) {
    console.error('Error importing CSV:', error);
    res.status(500).json({ error: 'Błąd podczas importu danych z CSV' });
  }
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🌱 PlantManager MVP działa na porcie ${port}`);
  console.log(`📍 Serwer dostępny pod adresem: http://localhost:${port}`);
});