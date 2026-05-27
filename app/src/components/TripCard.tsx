import { useState } from 'react';
import { MapPin, Calendar, Users, ArrowRight } from 'lucide-react';
import type { Trip } from '@/types';
import UserAvatar from './UserAvatar';
import StarRating from './StarRating';
import Modal from './Modal';
import { usersService } from '@/services/users';
import type { UserProfile } from '@/services/users';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TripCardProps {
  trip: Trip;
  onBook?: (tripId: number) => void;
  isBooking?: boolean;
}

export default function TripCard({ trip, onBook, isBooking = false }: TripCardProps) {
  const availableSeats = trip.seats - trip.seatsBooked;
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [publicProfile, setPublicProfile] = useState<UserProfile | null>(null);

  const driverName = trip.driver?.name ?? 'Conducteur';
  const driverRating = trip.driver?.rating ?? 0;
  const driverId = trip.driver?.id;

  const handleOpenDriverProfile = async () => {
    if (!driverId) {
      return;
    }

    setProfileOpen(true);
    setProfileLoading(true);
    setProfileError('');
    setPublicProfile(null);

    try {
      const profile = await usersService.getUserProfile(driverId);
      setPublicProfile(profile);
    } catch (error: any) {
      setProfileError(error?.message || 'Impossible de charger le profil public.');
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <>
      <div className="card-surface card-hover p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-lg font-semibold text-white">{trip.departure}</p>
            <p className="text-xs text-covoit-text-muted flex items-center gap-1 mt-0.5">
              <MapPin size={10} /> Depart
            </p>
          </div>
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-covoit-orange/10">
            <ArrowRight size={14} className="text-covoit-orange" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-lg font-semibold text-white">{trip.destination}</p>
            <p className="text-xs text-covoit-text-muted flex items-center gap-1 mt-0.5 justify-end">
              <MapPin size={10} /> Arrivee
            </p>
          </div>
        </div>

        <div className="h-px bg-white/[0.04]" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-covoit-text-secondary">
            <Calendar size={14} className="text-covoit-text-muted" />
            <span>
              {format(parseISO(trip.date), 'EEE d MMM yyyy', { locale: fr })} a {trip.time}
            </span>
          </div>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-covoit-orange/15 text-covoit-orange text-xs font-medium">
            <Users size={12} />
            {availableSeats} place{availableSeats > 1 ? 's' : ''}
          </span>
        </div>

        <p className="text-sm text-covoit-text-secondary">{trip.description}</p>

        <div className="h-px bg-white/[0.04]" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenDriverProfile}
              disabled={!driverId}
              className="rounded-full transition-transform hover:scale-105 disabled:cursor-default"
              title={driverId ? 'Voir le profil public' : 'Profil indisponible'}
            >
              <UserAvatar name={driverName} size={36} />
            </button>
            <div>
              <p className="text-sm font-medium text-white">{driverName}</p>
              <StarRating rating={driverRating} size={12} />
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-covoit-orange">{trip.price} TND</p>
            <p className="text-xs text-covoit-text-muted">par place</p>
          </div>
        </div>

        {onBook && (
          <button
            onClick={() => onBook(trip.id)}
            disabled={isBooking}
            className="w-full btn-primary py-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBooking ? 'Reservation en cours...' : 'Reserver'}
          </button>
        )}
      </div>

      <Modal open={profileOpen} onClose={() => setProfileOpen(false)} title="Profil public conducteur">
        {profileLoading ? (
          <div className="py-8 text-center text-covoit-text-secondary">Chargement du profil...</div>
        ) : profileError ? (
          <div className="py-6 text-sm text-covoit-error">{profileError}</div>
        ) : publicProfile ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <UserAvatar name={publicProfile.name} size={48} />
              <div>
                <p className="text-white font-semibold">{publicProfile.name}</p>
                <p className="text-covoit-text-secondary text-sm">Conducteur</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-covoit-text-secondary">Telephone</span>
                <span className="text-white">{publicProfile.phone || 'Non renseigne'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-covoit-text-secondary">Note</span>
                <span className="text-white">{publicProfile.rating ?? 0} / 5</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-sm text-covoit-text-secondary">Aucune donnee publique disponible.</div>
        )}
      </Modal>
    </>
  );
}
