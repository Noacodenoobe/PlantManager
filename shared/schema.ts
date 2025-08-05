import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Tabela lokalizacji z hierarchiczną strukturą
export const locations = sqliteTable('locations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  level: integer('level').notNull(), // 1: Piętro, 2: Strefa główna, 3: Lokalizacja szczegółowa, 4: Rodzaj donicy, 5: Lokalizacja precyzyjna
  parentId: integer('parent_id').references(() => locations.id, { onDelete: 'cascade' }),
});

// Tabela roślin
export const plants = sqliteTable('plants', {
  id: text('id').primaryKey(), // Unikalny ID z pliku CSV, np. "P10_R1"
  species: text('species').notNull(), // Gatunek rośliny
  locationId: integer('location_id').references(() => locations.id),
  status: text('status').notNull().default('Zdrowa'), // Status rośliny
  notes: text('notes'), // Dodatkowe notatki
});

// Minimalna tabela użytkowników
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
});

// Relacje
export const locationsRelations = relations(locations, ({ one, many }) => ({
  parent: one(locations, {
    fields: [locations.parentId],
    references: [locations.id],
    relationName: 'parent_child',
  }),
  children: many(locations, {
    relationName: 'parent_child',
  }),
  plants: many(plants),
}));

export const plantsRelations = relations(plants, ({ one }) => ({
  location: one(locations, {
    fields: [plants.locationId],
    references: [locations.id],
  }),
}));

// Schematy walidacji dla formularzy
export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
});

export const insertPlantSchema = createInsertSchema(plants);

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

// Rozszerzone schematy z dodatkowymi regułami walidacji
export const createPlantSchema = insertPlantSchema.extend({
  status: z.enum(['Zdrowa', 'Do obserwacji', 'W trakcie leczenia', 'Do usunięcia']),
});

export const updatePlantSchema = createPlantSchema.partial().extend({
  id: z.string().min(1),
});

// Typy TypeScript
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type Plant = typeof plants.$inferSelect;
export type InsertPlant = z.infer<typeof insertPlantSchema>;
export type CreatePlant = z.infer<typeof createPlantSchema>;
export type UpdatePlant = z.infer<typeof updatePlantSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Typ dla hierarchii lokalizacji z pełną ścieżką
export type LocationWithPath = Location & {
  fullPath: string;
  children?: LocationWithPath[];
};

// Typ dla rośliny z pełnymi informacjami o lokalizacji
export type PlantWithLocation = Plant & {
  location?: LocationWithPath;
};