import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tripsService } from '@/services/trips';
import type { Trip } from '@/types';
import { useApp } from '@/context/AppContext';

import {
  MapPin,
  Calendar,
  Users,
  ArrowRight,
  Clock,
  Wallet,
} from 'lucide-react';

import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

import UserAvatar from '@/components/UserAvatar';
import StarRating from '@/components/StarRating';

export default function TripDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { createBooking } = useApp();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState('');

  // LOAD TRIP
  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        setLoading(true);
        const data = await tripsService.getTripById(Number(id));
        setTrip(data);
      } catch {
        setError('Impossible de charger le trajet');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  // BOOKING
 const handleBooking = async () => {
  if (!trip || isBooking) return;

  const availableSeats = trip.seats - trip.seatsBooked;
  if (availableSeats <= 0) return;

  try {
    setIsBooking(true);

    await createBooking(trip.id); // logique identique card/context

    navigate('/reservations');
  } catch (err) {
    console.error(err);
    setError('Erreur lors de la réservation');
  } finally {
    setIsBooking(false);
  }
};

  if (loading) {
    return <div className="text-white p-6">Chargement...</div>;
  }

  if (error || !trip) {
    return <div className="text-red-500 p-6">{error || 'Trajet introuvable'}</div>;
  }

  const availableSeats = trip.seats - trip.seatsBooked;
  const isFull = availableSeats <= 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6 animate-fade-in">

      {/* HEADER */}
      <div className="card-surface p-6 space-y-5">

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">
            Détails du trajet
          </h1>

          <span className={`text-xs px-3 py-1 rounded-full ${
            isFull
              ? 'bg-covoit-error/10 text-covoit-error'
              : 'bg-covoit-orange/10 text-covoit-orange'
          }`}>
            {isFull ? 'Complet' : `${availableSeats} places`}
          </span>
        </div>

        {/* ROUTE */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-white">{trip.departure}</p>
            <p className="text-xs text-covoit-text-muted flex items-center gap-1">
              <MapPin size={12} /> Départ
            </p>
          </div>

          <ArrowRight className="text-covoit-orange" />

          <div className="text-right">
            <p className="text-lg font-bold text-white">{trip.destination}</p>
            <p className="text-xs text-covoit-text-muted flex justify-end items-center gap-1">
              <MapPin size={12} /> Arrivée
            </p>
          </div>
        </div>
      </div>

      {/* INFOS */}
      <div className="grid grid-cols-2 gap-4">

        <div className="card-surface p-4 flex gap-3 items-center">
          <Calendar className="text-covoit-orange" />
          <div>
            <p className="text-white text-sm">
              {format(parseISO(trip.date), 'EEE d MMM yyyy', { locale: fr })}
            </p>
            <p className="text-xs text-covoit-text-muted">Date</p>
          </div>
        </div>

        <div className="card-surface p-4 flex gap-3 items-center">
          <Clock className="text-covoit-orange" />
          <div>
            <p className="text-white text-sm">{trip.time}</p>
            <p className="text-xs text-covoit-text-muted">Heure</p>
          </div>
        </div>

        <div className="card-surface p-4 flex gap-3 items-center">
          <Users className="text-covoit-orange" />
          <div>
            <p className="text-white text-sm">
              {availableSeats}/{trip.seats}
            </p>
            <p className="text-xs text-covoit-text-muted">Places</p>
          </div>
        </div>

        <div className="card-surface p-4 flex gap-3 items-center">
          <Wallet className="text-covoit-orange" />
          <div>
            <p className="text-white text-sm font-semibold">
              {trip.price} TND
            </p>
            <p className="text-xs text-covoit-text-muted">Prix</p>
          </div>
        </div>
      </div>

      {/* DRIVER */}
      <div className="card-surface p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <UserAvatar name={trip.driver?.name ?? 'Conducteur'} size={56} />
          <div>
            <p className="text-white font-semibold">
              {trip.driver?.name}
            </p>
            <StarRating rating={trip.driver?.rating ?? 0} size={12} />
            <p className="text-xs text-covoit-text-muted mt-1">
              Conducteur
            </p>
          </div>
        </div>
      </div>

      {/* DESCRIPTION */}
      <div className="card-surface p-6">
        <h2 className="text-white font-semibold mb-2">Description</h2>
        <p className="text-covoit-text-secondary text-sm">
          {trip.description || 'Aucune description'}
        </p>
      </div>

      {/* CTA BUTTON */}
      <div className="sticky bottom-4">
        <button
          onClick={handleBooking}
          disabled={isBooking || isFull}
          className={`w-full py-3 text-sm font-medium rounded-xl transition-all ${
            isFull
              ? 'bg-gray-600 text-white cursor-not-allowed'
              : 'btn-primary hover:scale-[1.02]'
          } disabled:opacity-50`}
        >
          {isBooking
            ? 'Réservation en cours...'
            : isFull
              ? 'Trajet complet'
              : 'Réserver ce trajet'}
        </button>
      </div>

    </div>
  );
}