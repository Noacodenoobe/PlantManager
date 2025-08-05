# PlantManager MVP 🌱

**Aplikacja do zarządzania roślinami biurowymi z innowacyjnym systemem stref**

## 📋 Opis projektu

PlantManager MVP to aplikacja webowa przeznaczona do zarządzania roślinami w środowisku biurowym. Aplikacja wyróżnia się innowacyjnym systemem stref, który lepiej odzwierciedla rzeczywistą strukturę organizacyjną biura niż tradycyjna hierarchia lokalizacji.

### 🎯 Główne cele aplikacji:
- **Zarządzanie roślinami** - dodawanie, edycja, usuwanie i monitorowanie stanu roślin
- **System stref** - organizacja roślin według logicznych stref biurowych
- **Import danych** - masowe dodawanie roślin z plików CSV
- **Wyszukiwanie i filtrowanie** - zaawansowane narzędzia do znajdowania roślin

## 🚀 Szybkie uruchomienie

### Wymagania systemowe:
- Node.js (wersja 18 lub nowsza)
- npm lub yarn

### Instalacja i uruchomienie:

1. **Sklonuj repozytorium:**
   ```bash
   git clone https://github.com/[twoja-nazwa-uzytkownika]/PlantManager.git
   cd PlantManager
   ```

2. **Zainstaluj zależności:**
   ```bash
   npm install
   ```

3. **Zbuduj aplikację:**
   ```bash
   npm run build
   ```

4. **Uruchom serwer:**
   ```bash
   npm start
   ```

5. **Otwórz przeglądarkę:**
   ```
   http://localhost:3000
   ```

## 🔧 Tryb deweloperski

Dla rozwoju aplikacji zalecamy uruchomienie w trybie deweloperskim:

```bash
# Terminal 1 - Frontend (Vite dev server)
npm run dev

# Terminal 2 - Backend (Node.js server)
npm run dev:server
```

Frontend będzie dostępny pod `http://localhost:5173` z automatycznym proxy do backendu na porcie 3000.

## ✨ Funkcjonalności

### 📊 Lista roślin z zaawansowanymi opcjami

- **🔍 Wyszukiwanie** - szukaj według ID rośliny lub gatunku
- **🔽 Filtrowanie** - według statusu zdrowia i strefy
- **📈 Sortowanie** - według ID, gatunku, statusu lub strefy
- **👁️ Wiele widoków** - tabela, karty, grupowany według stref

### 🏢 System stref (zamiast lokalizacji)

Aplikacja używa nowego systemu stref, który lepiej odzwierciedla rzeczywistą strukturę biura:

- **Piętro** - np. "Piętro 1", "Piętro 2"
- **Strefa główna** - np. "Biuro główne", "Dział IT", "Kuchnia"
- **Podstrefa** - np. "Sala konferencyjna A", "Open space"
- **Typ obszaru** - np. "Doniczka ceramiczna", "Doniczka wisząca"
- **Lokalizacja precyzyjna** - np. "Przy oknie", "Na półce"

Każda strefa ma pełną ścieżkę, np.: "Piętro 1 > Biuro główne > Sala konferencyjna A > Doniczka ceramiczna > Przy oknie"

### 🌱 Zarządzanie roślinami

- **Dodawanie roślin** - z wyborem strefy z listy dostępnych
- **Edycja statusu** - Zdrowa, Do obserwacji, W trakcie leczenia, Do usunięcia
- **Usuwanie roślin** - z potwierdzeniem
- **Import CSV** - masowe dodawanie roślin z pliku CSV

### 📁 Import danych

Aplikacja obsługuje import z plików CSV z kolumnami:
- `ID_Rosliny` - unikalny identyfikator rośliny
- `Roslina` - nazwa gatunku
- `Pietro` - numer piętra
- `Strefa_glowna` - główna strefa
- `Lokalizacja_szczegolowa` - podstrefa
- `Rodzaj_donicy` - typ obszaru
- `Lokalizacja_precyzyjna` - dokładna lokalizacja

## 🛠️ Architektura techniczna

### Backend (Node.js + Express)
- **Serwer**: Express.js z TypeScript
- **Baza danych**: SQLite z automatycznym tworzeniem schematu
- **API**: RESTful API z obsługą CORS
- **Upload**: Multer do obsługi plików CSV

### Frontend (React + TypeScript)
- **Framework**: React 18 z TypeScript
- **Build tool**: Vite
- **Styling**: Tailwind CSS
- **State management**: TanStack Query
- **Routing**: Wouter (lekkie rozwiązanie)

### Struktura projektu:
```
PlantManager/
├── client/          # Frontend React
├── server/          # Backend Node.js
├── shared/          # Współdzielone typy
├── database.db      # Baza danych SQLite
└── start.js         # Główny plik serwera
```

## 🔧 Rozwiązywanie problemów

### Problem: Port 3000 zajęty
```bash
# Znajdź proces używający portu 3000
netstat -ano | findstr :3000

# Zatrzymaj proces (zastąp PID rzeczywistym numerem)
taskkill /PID [PID] /F
```

### Problem: Błąd "require is not defined"
- Upewnij się, że aplikacja została zbudowana: `npm run build`
- Sprawdź, czy wszystkie importy używają składni ES modules

### Problem: Baza danych nie aktualizuje się
- Zatrzymaj serwer: `taskkill /PID [PID] /F`
- Usuń starą bazę: `del database.db`
- Uruchom serwer ponownie: `npm start`

### Problem: Import CSV nie działa
- Sprawdź format pliku CSV (użyj przykładowego pliku `przykładowe_dane.csv`)
- Upewnij się, że kolumny mają poprawne nazwy
- Sprawdź, czy plik nie jest uszkodzony

## 📝 Najnowsze zmiany

### ✅ Naprawione problemy:

1. **🔍 System stref** - zastąpiono hierarchię lokalizacji systemem stref
2. **🔽 Filtrowanie** - teraz działa poprawnie według statusu i strefy
3. **🏢 Struktura danych** - każda strefa ma pełną ścieżkę hierarchii
4. **📊 Import CSV** - poprawnie mapuje dane do nowego systemu stref
5. **👁️ Widoki** - 3 różne widoki: tabela, karty, grupowany

### 🎯 Kluczowe ulepszenia:

- **Lepsze rozumienie struktury biura** - system stref odzwierciedla rzeczywistą organizację
- **Pełne ścieżki lokalizacji** - np. "Piętro 1 > Biuro główne > Sala konferencyjna A > Doniczka ceramiczna > Przy oknie"
- **Filtrowanie według stref** - możliwość filtrowania roślin według konkretnej strefy
- **Grupowanie według stref** - widok grupowy pokazuje rośliny pogrupowane według stref
- **Poprawne mapowanie danych** - import CSV tworzy strefy z pełną hierarchią

## 🤝 Współpraca

### Jak dodać nową funkcjonalność:

1. **Fork repozytorium**
2. **Utwórz branch**: `git checkout -b feature/nazwa-funkcjonalnosci`
3. **Wprowadź zmiany** i przetestuj
4. **Commit**: `git commit -m "Dodaj: opis zmian"`
5. **Push**: `git push origin feature/nazwa-funkcjonalnosci`
6. **Utwórz Pull Request**

### Standardy kodu:
- Używaj TypeScript dla wszystkich nowych plików
- Dodawaj komentarze w języku angielskim
- Testuj funkcjonalności przed commit
- Aktualizuj README przy dodawaniu nowych funkcji

## 📄 Licencja

Ten projekt jest dostępny na licencji MIT. Zobacz plik `LICENSE` dla szczegółów.

## 👨‍💻 Autor

PlantManager MVP - aplikacja do zarządzania roślinami biurowymi

---

**🌱 Dziękujemy za używanie PlantManager MVP!**