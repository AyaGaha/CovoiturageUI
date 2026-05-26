import { useState } from 'react';
import { X, Loader } from 'lucide-react';
import Modal from './Modal';
import type { Trip } from '@/types';
import type { UpdateTripRequest } from '@/services/trips';

interface EditTripModalProps {
  open: boolean;
  trip: Trip | null;
  onClose: () => void;
  onSubmit: (tripId: number, data: UpdateTripRequest) => Promise<void>;
  isLoading?: boolean;
}

export default function EditTripModal({ open, trip, onClose, onSubmit, isLoading = false }: EditTripModalProps) {
  const [formData, setFormData] = useState<UpdateTripRequest>({
    price: trip?.price || 10,
    seats: trip?.seats || 4,
    description: trip?.description || '',
  });
  const [error, setError] = useState('');

  // Update form when trip changes
  const handleOpen = () => {
    if (trip) {
      setFormData({
        price: trip.price,
        seats: trip.seats,
        description: trip.description || '',
      });
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;
    setError('');

    // Validations
    if (formData.seats < 1 || formData.seats > 8) {
      setError('Le nombre de places doit être entre 1 et 8');
      return;
    }
    if (formData.price < 0) {
      setError('Le prix ne peut pas être négatif');
      return;
    }

    try {
      await onSubmit(trip.id, formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    }
  };

  if (!trip) return null;

  return (
    <Modal open={open} onClose={onClose} maxWidth="500px">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Modifier le trajet</h2>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
          <X size={20} className="text-covoit-text-secondary" />
        </button>
      </div>

      <div className="mb-4 p-3 rounded-lg bg-white/5">
        <p className="text-sm text-covoit-text-secondary">
          <span className="font-medium text-white">{trip.departure}</span>
          {' → '}
          <span className="font-medium text-white">{trip.destination}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Seats */}
        <div>
          <label className="block text-xs font-medium text-covoit-text-secondary mb-1.5">
            Nombre de places *
          </label>
          <input
            type="number"
            min="1"
            max="8"
            value={formData.seats}
            onChange={e => setFormData({ ...formData, seats: parseInt(e.target.value) || 1 })}
            className="input-field"
            disabled={isLoading}
            required
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs font-medium text-covoit-text-secondary mb-1.5">
            Prix par personne (TND) *
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={formData.price}
            onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            className="input-field"
            disabled={isLoading}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-covoit-text-secondary mb-1.5">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder="Décrivez votre trajet (climatisation, radio, etc.)"
            className="input-field resize-none h-20"
            disabled={isLoading}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 text-covoit-text-secondary font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-lg gradient-orange text-white font-medium hover:shadow-lg hover:shadow-covoit-orange/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader size={16} className="animate-spin" />}
            {isLoading ? 'Modification...' : 'Modifier'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
