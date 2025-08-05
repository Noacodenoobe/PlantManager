import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SQLiteStorage } from './storage';
import { createRoutes } from './routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize storage
const storage = new SQLiteStorage();

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, '../dist')));

// API routes
app.use('/api', createRoutes(storage));

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🌱 PlantManager MVP działa na porcie ${port}`);
  console.log(`📍 Serwer dostępny pod adresem: http://localhost:${port}`);
});