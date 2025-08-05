import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router, Route, Switch } from 'wouter';
import PlantsList from './pages/PlantsList';
import AddPlant from './pages/AddPlant';
import ImportCSV from './pages/ImportCSV';
import ErrorBoundary from './components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        const response = await fetch(url);

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // If JSON parsing fails, use default message
          }
          throw new Error(errorMessage);
        }

        return response.json();
      },
      staleTime: 1000 * 60 * 5,
      retry: (failureCount, error) => {
        // Don't retry for 4xx errors (client errors)
        if (error.message.includes('HTTP 4')) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <div style={{ minHeight: '100vh' }}>
          <header className="header">
            <div className="container">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    background: '#22c55e',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '18px',
                  }}
                >
                  🌱
                </div>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                    PlantManager MVP
                  </h1>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                    Panel administratora roślin biurowych
                  </p>
                </div>
              </div>
            </div>
          </header>

          <nav className="nav">
            <div className="container">
              <div className="nav-links">
                <a href="/" className="nav-link">
                  <span>📋</span>
                  Lista roślin
                </a>
                <a href="/add" className="nav-link">
                  <span>➕</span>
                  Dodaj roślinę
                </a>
                <a href="/import" className="nav-link">
                  <span>📤</span>
                  Import CSV
                </a>
              </div>
            </div>
          </nav>

          <main className="main">
            <div className="container">
              <Router>
                <Switch>
                  <Route path="/" component={PlantsList} />
                  <Route path="/add" component={AddPlant} />
                  <Route path="/import" component={ImportCSV} />
                  <Route>
                    <div className="empty-state">
                      <h2>Strona nie znaleziona</h2>
                      <p>Wybierz jedną z opcji z menu nawigacji.</p>
                    </div>
                  </Route>
                </Switch>
              </Router>
            </div>
          </main>
        </div>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
