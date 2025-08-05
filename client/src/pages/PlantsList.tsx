import { useState, useMemo } from 'react';
import { useQuery, useMutation, QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient();

type Plant = {
  id: string;
  species: string;
  status: string;
  notes?: string;
  zone?: {
    id: number;
    fullPath: string;
  };
};

const statusClasses: {[key: string]: string} = {
  'Zdrowa': 'status-healthy',
  'Do obserwacji': 'status-warning',
  'W trakcie leczenia': 'status-treatment',
  'Do usunięcia': 'status-danger',
};

type ViewMode = 'table' | 'cards' | 'grouped';

export default function PlantsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [mainZoneFilter, setMainZoneFilter] = useState('');
  const [subZoneFilter, setSubZoneFilter] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Build query parameters for hierarchical filtering
  const queryParams = useMemo(() => {
    const params: any = {};
    if (searchQuery) params.search = searchQuery;
    if (statusFilter) params.status = statusFilter;
    if (zoneFilter) params.zoneId = zoneFilter;
    if (floorFilter) params.floor = floorFilter;
    if (mainZoneFilter) params.mainZone = mainZoneFilter;
    if (subZoneFilter) params.subZone = subZoneFilter;
    return params;
  }, [searchQuery, statusFilter, zoneFilter, floorFilter, mainZoneFilter, subZoneFilter]);

  const { data: plants = [] } = useQuery({
    queryKey: ['/api/plants', queryParams],
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['/api/zones'],
  });

  const { data: floors = [] } = useQuery({
    queryKey: ['/api/floors'],
  });

  const { data: mainZones = [] } = useQuery({
    queryKey: ['/api/main-zones', { floor: floorFilter }],
  });

  const { data: subZones = [] } = useQuery({
    queryKey: ['/api/sub-zones', { floor: floorFilter, mainZone: mainZoneFilter }],
  });

  // Filter and sort plants
  const filteredPlants = useMemo(() => {
    let filtered = (plants as Plant[]).filter(plant => {
      const matchesSearch = !searchQuery || 
        plant.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plant.species.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = !statusFilter || plant.status === statusFilter;
      
      const matchesZone = !zoneFilter || plant.zone?.id === parseInt(zoneFilter);
      
      return matchesSearch && matchesStatus && matchesZone;
    });

    // Sort plants
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'id':
          return a.id.localeCompare(b.id);
        case 'species':
          return a.species.localeCompare(b.species);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'zone':
          return (a.zone?.fullPath || '').localeCompare(b.zone?.fullPath || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [plants, searchQuery, statusFilter, zoneFilter, sortBy]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/plants/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Błąd podczas usuwania rośliny');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
    },
  });

  const handleDelete = async (id: string) => {
    if (window.confirm('Czy na pewno chcesz usunąć tę roślinę?')) {
      try {
        await deleteMutation.mutateAsync(id);
        window.alert('Roślina została usunięta');
      } catch (error) {
        window.alert(`Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
      }
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    const baseStyle = {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      display: 'inline-block',
    };

    switch (status) {
      case 'Zdrowa':
        return { ...baseStyle, backgroundColor: '#dcfce7', color: '#166534' };
      case 'Do obserwacji':
        return { ...baseStyle, backgroundColor: '#fef3c7', color: '#92400e' };
      case 'W trakcie leczenia':
        return { ...baseStyle, backgroundColor: '#fce7f3', color: '#be185d' };
      case 'Do usunięcia':
        return { ...baseStyle, backgroundColor: '#fee2e2', color: '#991b1b' };
      default:
        return { ...baseStyle, backgroundColor: '#f3f4f6', color: '#374151' };
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setZoneFilter('');
    setFloorFilter('');
    setMainZoneFilter('');
    setSubZoneFilter('');
  };

  const renderTableView = () => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>ID Rośliny</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Gatunek</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Strefa</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Akcje</th>
          </tr>
        </thead>
        <tbody>
          {filteredPlants.map((plant) => (
            <tr key={plant.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '12px' }}>{plant.id}</td>
              <td style={{ padding: '12px' }}>{plant.species}</td>
              <td style={{ padding: '12px' }}>
                {plant.zone ? plant.zone.fullPath : 'Brak strefy'}
              </td>
              <td style={{ padding: '12px' }}>
                <span style={getStatusBadgeStyle(plant.status)}>
                  {plant.status}
                </span>
              </td>
              <td style={{ padding: '12px' }}>
                <button
                  onClick={() => handleDelete(plant.id)}
                  style={{
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginRight: '8px'
                  }}
                >
                  🗑️ Usuń
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderCardsView = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
      {filteredPlants.map((plant) => (
        <div key={plant.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: 'white' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>{plant.id}</h3>
          <p style={{ margin: '0 0 8px 0', color: '#6b7280' }}>{plant.species}</p>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
            <strong>Strefa:</strong> {plant.zone ? plant.zone.fullPath : 'Brak strefy'}
          </p>
          <div style={{ marginBottom: '8px' }}>
            <span style={getStatusBadgeStyle(plant.status)}>
              {plant.status}
            </span>
          </div>
          {plant.notes && (
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
              <strong>Notatki:</strong> {plant.notes}
            </p>
          )}
          <button
            onClick={() => handleDelete(plant.id)}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            🗑️ Usuń
          </button>
        </div>
      ))}
    </div>
  );

  const renderGroupedView = () => {
    const groupedPlants = useMemo(() => {
      const groups: { [key: string]: Plant[] } = {};
      filteredPlants.forEach(plant => {
        const zoneName = plant.zone ? plant.zone.fullPath : 'Brak strefy';
        if (!groups[zoneName]) {
          groups[zoneName] = [];
        }
        groups[zoneName].push(plant);
      });
      return groups;
    }, [filteredPlants]);

    return (
      <div style={{ marginTop: '20px' }}>
        {Object.entries(groupedPlants).map(([zoneName, zonePlants]) => (
          <div key={zoneName} style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
              {zoneName} ({zonePlants.length} roślin)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
              {zonePlants.map((plant) => (
                <div key={plant.id} style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '12px', backgroundColor: 'white' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600' }}>{plant.id}</h4>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280' }}>{plant.species}</p>
                  <span style={getStatusBadgeStyle(plant.status)}>
                    {plant.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <span style={{ fontSize: '24px', fontWeight: '600', marginRight: '8px' }}>🌱</span>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
          Lista roślin ({filteredPlants.length})
        </h1>
      </div>

      {/* Enhanced Controls */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Szukaj według ID lub gatunku..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            minWidth: '200px'
          }}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: 'white'
          }}
        >
          <option value="">Wszystkie statusy</option>
          <option value="Zdrowa">Zdrowa</option>
          <option value="Do obserwacji">Do obserwacji</option>
          <option value="W trakcie leczenia">W trakcie leczenia</option>
          <option value="Do usunięcia">Do usunięcia</option>
        </select>

        {/* Hierarchical Filters */}
        <select
          value={floorFilter}
          onChange={(e) => {
            setFloorFilter(e.target.value);
            setMainZoneFilter('');
            setSubZoneFilter('');
          }}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: 'white'
          }}
        >
          <option value="">Wszystkie piętra</option>
          {(floors as string[]).map((floor) => (
            <option key={floor} value={floor}>
              {floor}
            </option>
          ))}
        </select>

        <select
          value={mainZoneFilter}
          onChange={(e) => {
            setMainZoneFilter(e.target.value);
            setSubZoneFilter('');
          }}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: 'white'
          }}
        >
          <option value="">Wszystkie strefy główne</option>
          {(mainZones as string[]).map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>

        <select
          value={subZoneFilter}
          onChange={(e) => setSubZoneFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: 'white'
          }}
        >
          <option value="">Wszystkie podstrefy</option>
          {(subZones as string[]).map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>

        <select
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: 'white'
          }}
        >
          <option value="">Wszystkie strefy</option>
          {(zones as any[]).map((zone: any) => (
            <option key={zone.id} value={zone.id}>
              {zone.full_path}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: 'white'
          }}
        >
          <option value="id">ID (A-Z)</option>
          <option value="species">Gatunek (A-Z)</option>
          <option value="status">Status</option>
          <option value="zone">Strefa</option>
        </select>

        {/* Clear filters button */}
        <button
          onClick={clearFilters}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            cursor: 'pointer'
          }}
        >
          🗑️ Wyczyść filtry
        </button>

        {/* View mode buttons */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setViewMode('table')}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: viewMode === 'table' ? '#3b82f6' : 'white',
              color: viewMode === 'table' ? 'white' : '#374151',
              cursor: 'pointer'
            }}
          >
            📊
          </button>
          <button
            onClick={() => setViewMode('cards')}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: viewMode === 'cards' ? '#8b5cf6' : 'white',
              color: viewMode === 'cards' ? 'white' : '#374151',
              cursor: 'pointer'
            }}
          >
            🃏
          </button>
          <button
            onClick={() => setViewMode('grouped')}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: viewMode === 'grouped' ? '#f59e0b' : 'white',
              color: viewMode === 'grouped' ? 'white' : '#374151',
              cursor: 'pointer'
            }}
          >
            📁
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'table' && renderTableView()}
      {viewMode === 'cards' && renderCardsView()}
      {viewMode === 'grouped' && renderGroupedView()}
    </div>
  );
}