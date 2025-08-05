import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';

const queryClient = new (require('@tanstack/react-query').QueryClient)();

export default function ImportCSV() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
        const errorData = await response.json().catch(() => ({ error: 'Nieznany błąd' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setImportResult({
        success: true,
        message: data.message,
        importedRecords: data.importedRecords,
      });
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
    },
    onError: (error: any) => {
      setImportResult({
        success: false,
        message: error.message || 'Wystąpił błąd podczas importu',
      });
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      alert('Proszę wybrać plik CSV');
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
    fileInputRef.current?.click();
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
              <li>Kolumny lokalizacji: Pietro, Strefa_glowna, Lokalizacja_szczegolowa, Rodzaj_donicy, Lokalizacja_precyzyjna</li>
              <li>Kodowanie UTF-8</li>
              <li>Separator: przecinek (,)</li>
            </ul>
          </div>
        </div>

        <div
          className={`drop-zone ${dragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleClick}
          style={{ marginBottom: '24px' }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              📄
            </div>
            
            {selectedFile ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>{selectedFile.name}</p>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                  Rozmiar: {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>Przeciągnij i upuść plik CSV tutaj</p>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                  lub kliknij, aby wybrać plik
                </p>
              </div>
            )}
          </div>
        </div>

        {selectedFile && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button
              onClick={handleImport}
              disabled={importMutation.isPending}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              {importMutation.isPending ? 'Importowanie...' : 'Importuj dane'}
            </button>
            
            <button
              onClick={() => {
                setSelectedFile(null);
                setImportResult(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              disabled={importMutation.isPending}
              className="btn btn-secondary"
            >
              Anuluj
            </button>
          </div>
        )}

        {importResult && (
          <div className={`alert ${importResult.success ? 'alert-success' : 'alert-error'}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>
                {importResult.success ? '✅' : '❌'}
              </span>
              <div>
                <p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>
                  {importResult.success ? 'Import zakończony sukcesem!' : 'Błąd importu'}
                </p>
                <p style={{ fontSize: '14px', margin: 0 }}>
                  {importResult.message}
                </p>
                {importResult.importedRecords && (
                  <p style={{ fontSize: '14px', margin: '4px 0 0 0' }}>
                    Zaimportowano rekordów: {importResult.importedRecords}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}