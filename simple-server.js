const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const Database = require('better-sqlite3');
const multer = require('multer');
const Papa = require('papaparse');
const busboy = require('busboy');

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

// Utility functions
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers });
    const fields = {};
    const files = {};
    
    bb.on('field', (name, value) => {
      fields[name] = value;
    });
    
    bb.on('file', (name, file, info) => {
      const chunks = [];
      file.on('data', chunk => chunks.push(chunk));
      file.on('end', () => {
        files[name] = {
          buffer: Buffer.concat(chunks),
          originalname: info.filename,
          mimetype: info.mimeType
        };
      });
    });
    
    bb.on('finish', () => {
      resolve({ fields, files });
    });
    
    bb.on('error', reject);
    
    req.pipe(bb);
  });
}

function sendResponse(res, statusCode, data, contentType = 'application/json') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  
  if (contentType === 'application/json') {
    res.end(JSON.stringify(data));
  } else {
    res.end(data);
  }
}

function serveStaticFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendResponse(res, 404, { error: 'File not found' });
      return;
    }
    
    const ext = path.extname(filePath);
    let contentType = 'text/plain';
    
    switch (ext) {
      case '.html': contentType = 'text/html'; break;
      case '.js': contentType = 'application/javascript'; break;
      case '.css': contentType = 'text/css'; break;
      case '.json': contentType = 'application/json'; break;
      case '.png': contentType = 'image/png'; break;
      case '.jpg': contentType = 'image/jpeg'; break;
      case '.svg': contentType = 'image/svg+xml'; break;
    }
    
    sendResponse(res, 200, data, contentType);
  });
}

// Server handler
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;
  
  try {
    // Handle CORS preflight
    if (method === 'OPTIONS') {
      sendResponse(res, 200, {});
      return;
    }
    
    // API Routes
    if (pathname === '/api/plants' && method === 'GET') {
      const { search, status, locationId } = parsedUrl.query;
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
      
      sendResponse(res, 200, result);
      return;
    }
    
    if (pathname === '/api/locations' && method === 'GET') {
      const { level, parentId } = parsedUrl.query;
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
      sendResponse(res, 200, locations);
      return;
    }
    
    if (pathname === '/api/plants' && method === 'POST') {
      const body = await parseBody(req);
      const { id, species, locationId, status, notes } = body;
      
      if (!id || !species) {
        sendResponse(res, 400, { error: 'ID i gatunek są wymagane' });
        return;
      }
      
      const stmt = db.prepare(`
        INSERT INTO plants (id, species, location_id, status, notes)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(id, species, locationId || null, status || 'Zdrowa', notes || null);
      
      sendResponse(res, 201, { id, species, locationId, status, notes });
      return;
    }
    
    if (pathname.startsWith('/api/plants/') && method === 'PATCH') {
      const id = pathname.split('/').pop();
      const updates = await parseBody(req);
      
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
        sendResponse(res, 404, { error: 'Roślina nie została znaleziona' });
        return;
      }
      
      const plant = db.prepare('SELECT * FROM plants WHERE id = ?').get(id);
      sendResponse(res, 200, plant);
      return;
    }
    
    if (pathname.startsWith('/api/plants/') && method === 'DELETE') {
      const id = pathname.split('/').pop();
      const stmt = db.prepare('DELETE FROM plants WHERE id = ?');
      const result = stmt.run(id);
      
      if (result.changes === 0) {
        sendResponse(res, 404, { error: 'Roślina nie została znaleziona' });
        return;
      }
      
      sendResponse(res, 204, {});
      return;
    }
    
    if (pathname === '/api/import-csv' && method === 'POST') {
      const { fields, files } = await parseMultipart(req);
      
      if (!files.csvFile) {
        sendResponse(res, 400, { error: 'Nie przesłano pliku CSV' });
        return;
      }

      const csvText = files.csvFile.buffer.toString('utf-8');
      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      if (parseResult.errors.length > 0) {
        sendResponse(res, 400, { 
          error: 'Błąd podczas parsowania pliku CSV', 
          details: parseResult.errors 
        });
        return;
      }

      // Import logic
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
      
      sendResponse(res, 200, { 
        message: 'Pomyślnie zaimportowano dane z pliku CSV',
        importedRecords: parseResult.data.length
      });
      return;
    }
    
    // Static file serving
    if (pathname === '/' || pathname === '/add' || pathname === '/import') {
      serveStaticFile(res, path.join(__dirname, 'dist/index.html'));
      return;
    }
    
    if (pathname.startsWith('/assets/')) {
      serveStaticFile(res, path.join(__dirname, 'dist', pathname));
      return;
    }
    
    // 404 for other routes
    sendResponse(res, 404, { error: 'Not found' });
    
  } catch (error) {
    console.error('Server error:', error);
    sendResponse(res, 500, { error: 'Błąd serwera' });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`🌱 PlantManager MVP działa na porcie ${port}`);
  console.log(`📍 Serwer dostępny pod adresem: http://localhost:${port}`);
});