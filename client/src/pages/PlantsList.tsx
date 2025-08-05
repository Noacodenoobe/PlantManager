import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

type Plant = {
  id: string;
  species: string;
  status: string;
  notes?: string;
  location?: {
    id: number;
    name: string;
    fullPath: string;
  };
};

const queryClient = new (require('@tanstack/react-query').QueryClient)();

const statusClasses = {
  'Zdrowa': 'status-badge status-healthy',
  'Do obserwacji': 'status-badge status-observation',
  'W trakcie leczenia': 'status-badge status-treatment',
  'Do usunięcia': 'status-badge status-removal',
};

export default function PlantsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);

  const { data: plants = [], isLoading } = useQuery({
    queryKey: ['/api/plants', searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status', statusFilter);
      
      const url = `/api/plants${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (plantId: string) => {
      const response = await fetch(`/api/plants/${plantId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/plants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
      setEditingPlant(null);
    },
  });

  if (isLoading) {
    return <div className="loading">Ładowanie roślin...</div>;
  }

  return (
    <div>
      <div className="search-bar">
        <div className="search-input">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Szukaj według ID lub gatunku..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-select"
          style={{ minWidth: '200px' }}
        >
          <option value="">Wszystkie statusy</option>
          <option value="Zdrowa">Zdrowa</option>
          <option value="Do obserwacji">Do obserwacji</option>
          <option value="W trakcie leczenia">W trakcie leczenia</option>
          <option value="Do usunięcia">Do usunięcia</option>
        </select>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>
          Lista roślin ({plants.length})
        </h2>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID Rośliny</th>
                <th>Gatunek</th>
                <th>Lokalizacja</th>
                <th>Status</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {plants.map((plant: Plant) => (
                <tr key={plant.id}>
                  <td style={{ fontWeight: 'bold' }}>{plant.id}</td>
                  <td>{plant.species}</td>
                  <td>{plant.location?.fullPath || plant.location?.name || 'Brak lokalizacji'}</td>
                  <td>
                    {editingPlant?.id === plant.id ? (
                      <select
                        value={plant.status}
                        onChange={(e) => updateStatusMutation.mutate({ id: plant.id, status: e.target.value })}
                        className="form-select"
                        style={{ minWidth: 'auto', fontSize: '12px', padding: '4px 8px' }}
                      >
                        <option value="Zdrowa">Zdrowa</option>
                        <option value="Do obserwacji">Do obserwacji</option>
                        <option value="W trakcie leczenia">W trakcie leczenia</option>
                        <option value="Do usunięcia">Do usunięcia</option>
                      </select>
                    ) : (
                      <span className={statusClasses[plant.status as keyof typeof statusClasses] || 'status-badge'}>
                        {plant.status}
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setEditingPlant(editingPlant?.id === plant.id ? null : plant)}
                        className="btn btn-secondary"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                        title="Edytuj status"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Czy na pewno chcesz usunąć roślinę ${plant.id}?`)) {
                            deleteMutation.mutate(plant.id);
                          }
                        }}
                        className="btn btn-danger"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                        title="Usuń roślinę"
                        disabled={deleteMutation.isPending}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {plants.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-state">
                    {searchQuery || statusFilter ? 'Nie znaleziono roślin spełniających kryteria' : 'Brak roślin w bazie danych'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}