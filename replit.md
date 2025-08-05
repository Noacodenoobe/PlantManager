# PlantManager MVP

## Przegląd Projektu

Aplikacja webowa do zarządzania bazą danych roślin biurowych z hierarchiczną strukturą lokalizacji i panelem administratora.

## Architektura

- **Backend**: Node.js HTTP Server + SQLite
- **Frontend**: React.js z TanStack Query
- **API**: REST API
- **Baza danych**: SQLite (database.db)
- **Styling**: Custom CSS (zastąpiono TailwindCSS ze względu na błędy konfiguracji)

## Struktura Danych

- **Locations**: Hierarchiczna struktura lokalizacji (5 poziomów)
- **Plants**: Dane roślin z przypisaniem do lokalizacji
- **Users**: Minimalna tabela użytkowników dla panelu admin

## Główne Funkcjonalności

1. Import danych z pliku CSV
2. Panel administratora z tabelą roślin
3. Wyszukiwanie i filtrowanie
4. Kaskadowe pola wyboru lokalizacji
5. Operacje CRUD na roślinach
6. Zarządzanie statusem roślin

## Preferencje Użytkownika

- Język: Polski
- Interfejs: Prosty panel administratora
- Priorytet: Hierarchiczna struktura lokalizacji z kaskadowymi polami wyboru

## Ostatnie Zmiany

- 2025-01-05: Rozpoczęcie projektu, analiza wymagań
- 2025-01-05: Zaimplementowano pełną aplikację PlantManager MVP z funkcjonalnym backendem i frontendem
- 2025-01-05: Zastąpiono Express.js prostym serwer HTTP z powodu problemów z routingiem
- 2025-01-05: Zrezygnowano z TailwindCSS na rzecz custom CSS ze względu na błędy konfiguracji

## Status Implementacji

- [x] Schemat bazy danych SQLite z tabelami locations, plants, users
- [x] Backend API z obsługą CRUD operations
- [x] Frontend React z polskim interfejsem użytkownika
- [x] Import CSV z parsowaniem Papa Parse i obsługą hierarchii lokalizacji
- [x] Kaskadowe pola wyboru lokalizacji (5 poziomów)
- [x] Panel administratora z operacjami CRUD na roślinach
- [x] Wyszukiwanie i filtrowanie roślin według statusu i tekstu
- [x] Responsywny interfejs z custom CSS

## Pliki Kluczowe

- `simple-server.js` - główny serwer HTTP z API endpoints
- `client/src/App.tsx` - główny komponent React z routingiem
- `client/src/pages/PlantsList.tsx` - lista roślin z wyszukiwaniem
- `client/src/pages/AddPlant.tsx` - formularz dodawania roślin
- `client/src/pages/ImportCSV.tsx` - import plików CSV
- `client/src/index.css` - style CSS
