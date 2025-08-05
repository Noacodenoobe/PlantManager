import { useState } from 'react';
import { useQuery, useMutation, QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient();

type Zone = {
  id: number;
  floor: string;
  main_zone: string;
  sub_zone?: string;
  area_type?: string;
  specific_location?: string;
  full_path: string;
};

export default function AddPlant() {
  const [formData, setFormData] = useState({
    id: '',
    species: '',
    status: 'Zdrowa',
    notes: '',
  });
  
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);

  const { data: zones = [] } = useQuery({
    queryKey: ['/api/zones'],
  });

  const createPlantMutation = useMutation({
    mutationFn: async (plantData: any) => {
      const response = await fetch('/api/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plantData),
      });
      
      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Błąd podczas dodawania rośliny');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
      setFormData({ id: '', species: '', status: 'Zdrowa', notes: '' });
      setSelectedZoneId(null);
      window.alert('Roślina została dodana pomyślnie!');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.id || !formData.species) {
      window.alert('ID i gatunek są wymagane!');
      return;
    }

    try {
      await createPlantMutation.mutateAsync({
        ...formData,
        zoneId: selectedZoneId,
      });
    } catch (error) {
      window.alert(`Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <span style={{ fontSize: '24px', fontWeight: '600', marginRight: '8px' }}>➕</span>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
          Dodaj nową roślinę
        </h1>
      </div>

      <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
            ID Rośliny *
          </label>
          <input
            type="text"
            name="id"
            value={formData.id}
            onChange={handleInputChange}
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
            placeholder="np. P01_R1"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
            Gatunek *
          </label>
          <input
            type="text"
            name="species"
            value={formData.species}
            onChange={handleInputChange}
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
            placeholder="np. Monstera deliciosa"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
            Strefa
          </label>
          <select
            value={selectedZoneId || ''}
            onChange={(e) => setSelectedZoneId(e.target.value ? parseInt(e.target.value) : null)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            <option value="">Wybierz strefę (opcjonalnie)</option>
            {(zones as Zone[]).map((zone: Zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.full_path}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            <option value="Zdrowa">Zdrowa</option>
            <option value="Do obserwacji">Do obserwacji</option>
            <option value="W trakcie leczenia">W trakcie leczenia</option>
            <option value="Do usunięcia">Do usunięcia</option>
          </select>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
            Notatki
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={3}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical'
            }}
            placeholder="Dodatkowe informacje o roślinie..."
          />
        </div>

        <button
          type="submit"
          disabled={createPlantMutation.isPending}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: createPlantMutation.isPending ? 'not-allowed' : 'pointer',
            opacity: createPlantMutation.isPending ? 0.6 : 1
          }}
        >
          {createPlantMutation.isPending ? 'Dodawanie...' : 'Dodaj roślinę'}
        </button>
      </form>
    </div>
  );
}