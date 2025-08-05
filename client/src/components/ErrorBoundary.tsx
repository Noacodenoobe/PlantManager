import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <span className="text-2xl">⚠️</span>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
          Wystąpił nieoczekiwany błąd
        </h2>

        <p className="text-gray-600 text-center mb-4">
          Przepraszamy, coś poszło nie tak. Spróbuj odświeżyć stronę lub skontaktuj się z
          administratorem.
        </p>

        <details className="mb-4">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            Szczegóły błędu (dla programistów)
          </summary>
          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>

        <div className="flex gap-3">
          <button
            onClick={resetErrorBoundary}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Spróbuj ponownie
          </button>

          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
          >
            Odśwież stronę
          </button>
        </div>
      </div>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        // Log error to console in development
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // In production, you might want to send this to an error reporting service
        // like Sentry, LogRocket, etc.
      }}
      onReset={() => {
        // Clear any cached data or reset application state if needed
        window.location.hash = '#/';
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}

export default ErrorBoundary;
