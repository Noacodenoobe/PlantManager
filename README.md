# PlantManager MVP

Aplikacja webowa do zarządzania bazą danych roślin biurowych z hierarchiczną strukturą lokalizacji i panelem administratora.

## Funkcjonalności

- 📋 **Lista roślin** - Przeglądanie, wyszukiwanie i filtrowanie roślin
- 🌱 **Dodawanie roślin** - Kaskadowe pola wyboru lokalizacji
- 📊 **Zarządzanie statusem** - Szybka edycja statusu zdrowotnego roślin
- 📤 **Import CSV** - Jednorazowy import danych z pliku CSV
- 🏢 **Hierarchia lokalizacji** - 5-poziomowa struktura lokalizacji

## Statusy roślin

- 🟢 **Zdrowa** - Roślina w dobrym stanie
- 🟡 **Do obserwacji** - Wymaga monitorowania
- 🟠 **W trakcie leczenia** - Aktywne leczenie
- 🔴 **Do usunięcia** - Konieczność usunięcia

## Instalacja

```bash
npm install
```

## Uruchomienie

Aplikacja uruchamia się automatycznie przy starcie Replit. Backend jest dostępny na porcie 3000, a frontend jest serwowany przez ten sam port.

## Struktura pliku CSV

Wymagane kolumny dla importu:
- `ID_Rosliny` - Unikalny identyfikator
- `Roslina` - Gatunek rośliny
- `Pietro` - Poziom 1 lokalizacji
- `Strefa_glowna` - Poziom 2 lokalizacji
- `Lokalizacja_szczegolowa` - Poziom 3 lokalizacji
- `Rodzaj_donicy` - Poziom 4 lokalizacji
- `Lokalizacja_precyzyjna` - Poziom 5 lokalizacji

## Technologie

- **Backend**: Node.js + Express + SQLite + Drizzle ORM
- **Frontend**: React + TypeScript + TailwindCSS + TanStack Query
- **Routing**: Wouter
- **Walidacja**: Zod