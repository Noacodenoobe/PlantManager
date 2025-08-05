import express from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import { z } from 'zod';
import { IStorage } from './storage';
import { createPlantSchema, updatePlantSchema, insertLocationSchema } from '../shared/schema';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

export function createRoutes(storage: IStorage) {
  // Plants endpoints
  router.get('/plants', async (req, res) => {
    try {
      const { search, status, locationId } = req.query;

      let plants;
      if (search) {
        plants = await storage.searchPlants(search as string);
      } else if (status || locationId) {
        plants = await storage.filterPlants({
          status: status as string,
          locationId: locationId ? parseInt(locationId as string) : undefined,
        });
      } else {
        plants = await storage.getAllPlants();
      }

      res.json(plants);
    } catch (error) {
      console.error('Error fetching plants:', error);
      res.status(500).json({ error: 'Błąd podczas pobierania roślin' });
    }
  });

  router.get('/plants/:id', async (req, res) => {
    try {
      const plant = await storage.getPlantById(req.params.id);
      if (!plant) {
        return res.status(404).json({ error: 'Roślina nie została znaleziona' });
      }
      res.json(plant);
    } catch (error) {
      console.error('Error fetching plant:', error);
      res.status(500).json({ error: 'Błąd podczas pobierania rośliny' });
    }
  });

  router.post('/plants', async (req, res) => {
    try {
      const validatedData = createPlantSchema.parse(req.body);
      const newPlant = await storage.createPlant(validatedData);
      res.status(201).json(newPlant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Nieprawidłowe dane', details: error.issues });
      }
      console.error('Error creating plant:', error);
      res.status(500).json({ error: 'Błąd podczas tworzenia rośliny' });
    }
  });

  router.patch('/plants/:id', async (req, res) => {
    try {
      const validatedData = updatePlantSchema.parse({ ...req.body, id: req.params.id });
      const { id, ...updates } = validatedData;

      const updatedPlant = await storage.updatePlant(id, updates);
      if (!updatedPlant) {
        return res.status(404).json({ error: 'Roślina nie została znaleziona' });
      }

      res.json(updatedPlant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Nieprawidłowe dane', details: error.issues });
      }
      console.error('Error updating plant:', error);
      res.status(500).json({ error: 'Błąd podczas aktualizacji rośliny' });
    }
  });

  router.delete('/plants/:id', async (req, res) => {
    try {
      const success = await storage.deletePlant(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Roślina nie została znaleziona' });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting plant:', error);
      res.status(500).json({ error: 'Błąd podczas usuwania rośliny' });
    }
  });

  // Locations endpoints
  router.get('/locations', async (req, res) => {
    try {
      const { level, parentId } = req.query;

      let locations;
      if (level) {
        locations = await storage.getLocationsByLevel(parseInt(level as string));
      } else if (parentId !== undefined) {
        const parent = parentId === 'null' ? null : parseInt(parentId as string);
        locations = await storage.getLocationsByParentId(parent);
      } else {
        locations = await storage.getAllLocations();
      }

      res.json(locations);
    } catch (error) {
      console.error('Error fetching locations:', error);
      res.status(500).json({ error: 'Błąd podczas pobierania lokalizacji' });
    }
  });

  router.get('/locations/hierarchy', async (req, res) => {
    try {
      const hierarchy = await storage.getLocationHierarchy();
      res.json(hierarchy);
    } catch (error) {
      console.error('Error fetching location hierarchy:', error);
      res.status(500).json({ error: 'Błąd podczas pobierania hierarchii lokalizacji' });
    }
  });

  router.post('/locations', async (req, res) => {
    try {
      const validatedData = insertLocationSchema.parse(req.body);
      const newLocation = await storage.createLocation(validatedData);
      res.status(201).json(newLocation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Nieprawidłowe dane', details: error.issues });
      }
      console.error('Error creating location:', error);
      res.status(500).json({ error: 'Błąd podczas tworzenia lokalizacji' });
    }
  });

  // CSV Import endpoint
  router.post('/import-csv', upload.single('csvFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nie przesłano pliku CSV' });
      }

      const csvText = req.file.buffer.toString('utf-8');
      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: header => {
          // Mapowanie nagłówków z polskiego CSV
          const headerMap: { [key: string]: string } = {
            'ID Rośliny': 'ID_Rosliny',
            ID_Rośliny: 'ID_Rosliny',
            Roślina: 'Roslina',
            Piętro: 'Pietro',
            'Strefa główna': 'Strefa_glowna',
            Strefa_główna: 'Strefa_glowna',
            'Lokalizacja szczegółowa': 'Lokalizacja_szczegolowa',
            Lokalizacja_szczegółowa: 'Lokalizacja_szczegolowa',
            'Rodzaj donicy': 'Rodzaj_donicy',
            Rodzaj_donicy: 'Rodzaj_donicy',
            'Lokalizacja precyzyjna': 'Lokalizacja_precyzyjna',
            Lokalizacja_precyzyjna: 'Lokalizacja_precyzyjna',
          };
          return headerMap[header] || header;
        },
      });

      if (parseResult.errors.length > 0) {
        return res.status(400).json({
          error: 'Błąd podczas parsowania pliku CSV',
          details: parseResult.errors,
        });
      }

      await storage.importCSVData(parseResult.data);

      res.json({
        message: 'Pomyślnie zaimportowano dane z pliku CSV',
        importedRecords: parseResult.data.length,
      });
    } catch (error) {
      console.error('Error importing CSV:', error);
      res.status(500).json({ error: 'Błąd podczas importu danych z CSV' });
    }
  });

  // Zone endpoints for frontend compatibility
  router.get('/zones', async (req, res) => {
    try {
      const locations = await storage.getAllLocations();
      const plants = await storage.getAllPlants();
      
      // Get location IDs that have plants assigned
      const usedLocationIds = new Set(plants.map(plant => plant.locationId).filter(Boolean));
      
      // Convert only locations that have plants assigned
      const filteredLocations = locations.filter(loc => usedLocationIds.has(loc.id) && loc.fullPath);
      
      const zones = filteredLocations.map(loc => ({
        id: loc.id,
        full_path: loc.fullPath || loc.name,
        floor: loc.floor,
        main_zone: loc.mainZone,
        sub_zone: loc.subZone,
        area_type: loc.areaType,
        specific_location: loc.specificLocation
      }));
      
      res.json(zones);
    } catch (error) {
      console.error('Error fetching zones:', error);
      res.status(500).json({ error: 'Błąd podczas pobierania stref' });
    }
  });

  router.get('/floors', async (req, res) => {
    try {
      const locations = await storage.getAllLocations();
      
      // Get unique floors
      const floors = [...new Set(
        locations
          .map(loc => loc.floor)
          .filter(Boolean) // Remove null/undefined values
      )].sort();
      
      res.json(floors);
    } catch (error) {
      console.error('Error fetching floors:', error);
      res.status(500).json({ error: 'Błąd podczas pobierania pięter' });
    }
  });

  router.get('/main-zones', async (req, res) => {
    try {
      const { floor } = req.query;
      const locations = await storage.getAllLocations();
      
      let filteredLocations = locations;
      if (floor) {
        filteredLocations = locations.filter(loc => loc.floor === floor);
      }
      
      // Get unique main zones
      const mainZones = [...new Set(
        filteredLocations
          .map(loc => loc.mainZone)
          .filter(Boolean) // Remove null/undefined values
      )].sort();
      
      res.json(mainZones);
    } catch (error) {
      console.error('Error fetching main zones:', error);
      res.status(500).json({ error: 'Błąd podczas pobierania stref głównych' });
    }
  });

  router.get('/sub-zones', async (req, res) => {
    try {
      const { floor, mainZone } = req.query;
      const locations = await storage.getAllLocations();
      
      let filteredLocations = locations;
      if (floor) {
        filteredLocations = filteredLocations.filter(loc => loc.floor === floor);
      }
      if (mainZone) {
        filteredLocations = filteredLocations.filter(loc => loc.mainZone === mainZone);
      }
      
      // Get unique sub zones
      const subZones = [...new Set(
        filteredLocations
          .map(loc => loc.subZone)
          .filter(Boolean) // Remove null/undefined values
      )].sort();
      
      res.json(subZones);
    } catch (error) {
      console.error('Error fetching sub zones:', error);
      res.status(500).json({ error: 'Błąd podczas pobierania podstref' });
    }
  });

  // Statistics endpoint
  router.get('/statistics', async (req, res) => {
    try {
      const allPlants = await storage.getAllPlants();
      const allLocations = await storage.getAllLocations();

      const statusStats = allPlants.reduce(
        (acc, plant) => {
          acc[plant.status] = (acc[plant.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      res.json({
        totalPlants: allPlants.length,
        totalLocations: allLocations.length,
        statusStats,
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({ error: 'Błąd podczas pobierania statystyk' });
    }
  });

  return router;
}
