import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

const queryClient = new (require('@tanstack/react-query').QueryClient)();

type Location = {
  id: number;
  name: string;
  level: number;
  parentId: number | null;
};

export default function AddPlant() {
  const [formData, setFormData] = useState({
    id: '',
    species: '',
    status: 'Zdrowa',
    notes: '',
  });
  
  const [selectedLocations, setSelectedLocations] = useState<{[key: number]: number | null}>({
    1: null, 2: null, 3: null, 4: null, 5: null,
  });

  const { data: allLocations = [] } = useQuery({
    queryKey: ['/api/locations'],
  });

  const getLocationsByLevel = (level: number, parentId: number | null = null) => {
    return allLocations.filter((loc: Location) => 
      loc.level === level && 
      (parentId === null ? loc.parentId === null : loc.parentId === parentId)
    );
  };

  const createPlantMutation = useMutation({
    mutationFn: async (plantData: any) => {
      const response = await fetch('/api/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plantData),
      });
      if (!response.ok) throw new Error('Failed to create plant');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
      setFormData({ id: '', species: '', status: 'Zdrowa', notes: '' });
      setSelectedLocations({ 1: null, 2: null, 3: null, 4: null, 5: null });
      alert('Roślina została pomyślnie dodana!');
    },
    onError: (error: any) => {
      alert(`Błąd podczas dodawania rośliny: ${error.message}`);
    },
  });

  const handleLocationChange = (level: number, locationId: number | null) => {
    const newSelections = { ...selectedLocations };
    for (let i = level; i <= 5; i++) {
      newSelections[i] = i === level ? locationId : null;
    }
    setSelectedLocations(newSelections);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.id || !formData.species) {
      alert('ID rośliny i gatunek są wymagane');
      return;
    }

    let finalLocationId = null;
    for (let level = 5; level >= 1; level--) {
      if (selectedLocations[level]) {
        finalLocationId = selectedLocations[level];
        break;
      }
    }

    createPlantMutation.mutate({
      ...formData,
      locationId: finalLocationId,
    });
  };

  const levelNames: {[key: number]: string} = {
    1: 'Piętro',
    2: 'Strefa główna',
    3: 'Lokalizacja szczegółowa',
    4: 'Rodzaj donicy',
    5: 'Lokalizacja precyzyjna',
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <span style={{ fontSize: '24px' }}>➕</span>
          <h2 style={{ margin: 0 }}>Dodaj nową roślinę</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-2" style={{ marginBottom: '24px' }}>
            <div className="form-group">
              <label className="form-label">ID Rośliny *</label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="np. P10_R1"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Gatunek rośliny *</label>
              <input
                type="text"
                value={formData.species}
                onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                placeholder="np. Epipremnum"
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="form-select"
            >
              <option value="Zdrowa">Zdrowa</option>
              <option value="Do obserwacji">Do obserwacji</option>
              <option value="W trakcie leczenia">W trakcie leczenia</option>
              <option value="Do usunięcia">Do usunięcia</option>
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Lokalizacja</h3>
            
            {[1, 2, 3, 4, 5].map((level) => {
              const availableLocations = getLocationsByLevel(
                level, 
                level === 1 ? null : selectedLocations[level - 1]
              );
              
              const isDisabled = level > 1 && !selectedLocations[level - 1];
              
              return (
                <div key={level} className="form-group">
                  <label className="form-label">{levelNames[level]}</label>
                  <select
                    value={selectedLocations[level] || ''}
                    onChange={(e) => handleLocationChange(level, e.target.value ? parseInt(e.target.value) : null)}
                    disabled={isDisabled}
                    className="form-select"
                    style={{ opacity: isDisabled ? 0.5 : 1 }}
                  >
                    <option value="">
                      {isDisabled ? `Wybierz najpierw ${levelNames[level - 1]}` : `Wybierz ${levelNames[level].toLowerCase()}`}
                    </option>
                    {availableLocations.map((location: Location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          <div className="form-group">
            <label className="form-label">Notatki</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Dodatkowe informacje o roślinie..."
              rows={3}
              className="form-textarea"
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={createPlantMutation.isPending}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              {createPlantMutation.isPending ? 'Dodawanie...' : 'Dodaj roślinę'}
            </button>
            
            <button
              type="button"
              onClick={() => {
                setFormData({ id: '', species: '', status: 'Zdrowa', notes: '' });
                setSelectedLocations({ 1: null, 2: null, 3: null, 4: null, 5: null });
              }}
              className="btn btn-secondary"
            >
              Wyczyść
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}