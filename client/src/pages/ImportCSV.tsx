import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function ImportCSV() {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    importedRecords?: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csvFile', file);

      const response = await fetch('/api/import-csv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ error: 'Nieznany błąd' }))) as {
          error?: string;
        };
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data: { message: string; importedRecords: number }) => {
      setImportResult({
        success: true,
        message: data.message,
        importedRecords: data.importedRecords,
      });
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
    },
    onError: (error: Error) => {
      setImportResult({
        success: false,
        message: error.message || 'Wystąpił błąd podczas importu',
      });
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = (e.dataTransfer as DataTransfer).files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      window.alert('Proszę wybrać plik CSV');
      return;
    }

    setSelectedFile(file);
    setImportResult(null);
  };

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  const handleClick = () => {
    (fileInputRef.current as HTMLInputElement)?.click();
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <span style={{ fontSize: '24px' }}>📤</span>
          <h2 style={{ margin: 0 }}>Import danych z pliku CSV</h2>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '8px' }}>Wymagania pliku CSV:</h3>
            <ul style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.5' }}>
              <li>Plik musi zawierać nagłówki kolumn</li>
              <li>Wymagane kolumny: ID_Rosliny, Roslina</li>
              <li>
                Kolumny lokalizacji: Pietro, Strefa_glowna, Lokalizacja_szczegolowa, Rodzaj_donicy,
                Lokalizacja_precyzyjna
              </li>
              <li>Kodowanie UTF-8</li>
              <li>Separator: przecinek (,)</li>
            </ul>
          </div>
        </div>

        <div
          style={{
            border: '2px dashed #d1d5db',
            borderRadius: '8px',
            padding: '32px',
            textAlign: 'center',
            backgroundColor: dragActive ? '#f3f4f6' : '#ffffff',
            borderColor: dragActive ? '#3b82f6' : '#d1d5db',
            transition: 'all 0.2s ease',
            marginBottom: '24px',
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>

          <h3 style={{ marginBottom: '8px' }}>
            {selectedFile ? selectedFile.name : 'Przeciągnij plik CSV lub kliknij, aby wybrać'}
          </h3>

          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            {selectedFile
              ? `Wybrany plik: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`
              : 'Obsługiwane formaty: CSV'}
          </p>

          <button
            onClick={handleClick}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Wybierz plik
          </button>
        </div>

        {selectedFile && (
          <div style={{ marginBottom: '24px' }}>
            <button
              onClick={handleImport}
              disabled={importMutation.isPending}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                width: '100%',
              }}
            >
              {importMutation.isPending ? 'Importowanie...' : 'Importuj dane'}
            </button>
          </div>
        )}

        {importResult && (
          <div
            style={{
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: importResult.success ? '#d1fae5' : '#fee2e2',
              border: `1px solid ${importResult.success ? '#10b981' : '#ef4444'}`,
              color: importResult.success ? '#065f46' : '#991b1b',
            }}
          >
            <h4 style={{ margin: '0 0 8px 0' }}>
              {importResult.success ? '✅ Import zakończony pomyślnie' : '❌ Błąd importu'}
            </h4>
            <p style={{ margin: 0 }}>
              {importResult.message}
              {importResult.importedRecords && (
                <span style={{ display: 'block', marginTop: '8px', fontWeight: 'bold' }}>
                  Zaimportowano {importResult.importedRecords} rekordów
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
