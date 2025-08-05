const Database = require('better-sqlite3');

const db = new Database('database.db');

console.log('=== TABLES ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables);

console.log('\n=== LOCATIONS TABLE STRUCTURE ===');
try {
  const structure = db.prepare("PRAGMA table_info(locations)").all();
  console.log(structure);
} catch(e) {
  console.log('No locations table');
}

console.log('\n=== ZONES TABLE STRUCTURE ===');
try {
  const structure = db.prepare("PRAGMA table_info(zones)").all();
  console.log(structure);
} catch(e) {
  console.log('No zones table');
}

console.log('\n=== SAMPLE LOCATIONS ===');
try {
  const locations = db.prepare('SELECT * FROM locations LIMIT 5').all();
  console.log(locations);
} catch(e) {
  console.log('Error:', e.message);
}

console.log('\n=== SAMPLE ZONES ===');
try {
  const zones = db.prepare('SELECT * FROM zones LIMIT 5').all();
  console.log(zones);
} catch(e) {
  console.log('Error:', e.message);
}

console.log('\n=== SAMPLE PLANTS ===');
try {
  const plants = db.prepare('SELECT * FROM plants LIMIT 5').all();
  console.log(plants);
} catch(e) {
  console.log('Error:', e.message);
}

db.close();