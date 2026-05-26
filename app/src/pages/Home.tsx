import { useState, useCallback, useEffect } from 'react';
import { MapPin, Calendar, Search } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import TripCard from '@/components/TripCard';
import Modal from '@/components/Modal';
import type { Trip } from '@/types';

function HeroSection() {
  return (
    <div className="relative w-full gradient-hero overflow-hidden" style={{ minHeight: 320 }}>
      {/* Animated mesh blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[500px] h-[500px] rounded-full animate-blob-1"
          style={{
            background: 'radial-gradient(circle, rgba(255,107,53,0.12) 0%, transparent 70%)',
            filter: 'blur(80px)',
            top: '-100px',
            left: '10%',
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full animate-blob-2"
          style={{
            background: 'radial-gradient(circle, rgba(74,144,217,0.10) 0%, transparent 70%)',
            filter: 'blur(80px)',
            bottom: '-50px',
            right: '15%',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center px-6 py-16 text-center" style={{ minHeight: 320 }}>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
          Trouvez votre prochain trajet
        </h1>
        <p className="text-covoit-text-secondary text-base md:text-lg max-w-lg">
          Voyagez entre villes à petit prix, en toute convivialité
        </p>
      </div>
    </div>
  );
}

function SearchBar({
  departure,
  setDeparture,
  destination,
  setDestination,
  date,
  setDate,
  onSearch,
}: {
  departure: string;
  setDeparture: (v: string) => void;
  destination: string;
  setDestination: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  onSearch: () => void;
}) {
  return (
    <div className="relative z-20 -mt-8 px-6">
      <div className="max-w-[800px] mx-auto glass-panel rounded-2xl p-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-covoit-text-muted" />
            <input
              type="text"
              value={departure}
              onChange={e => setDeparture(e.target.value)}
              placeholder="Départ"
              className="input-field pl-9"
            />
          </div>
          <div className="flex-1 relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-covoit-text-muted" />
            <input
              type="text"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              placeholder="Destination"
              className="input-field pl-9"
            />
          </div>
          <div className="flex-1 relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-covoit-text-muted" />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="input-field pl-9 text-covoit-text-secondary"
            />
          </div>
          <button
            onClick={onSearch}
            className="btn-primary flex items-center justify-center gap-2 px-6 py-3"
          >
            <Search size={16} />
            <span className="hidden sm:inline">Rechercher</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { trips, tripsLoading, searchTrips, createBooking } = useApp();
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [results, setResults] = useState<Trip[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [bookingTrip, setBookingTrip] = useState<Trip | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  const handleSearch = useCallback(async () => {
    const found = await searchTrips(departure, destination, date);
    setResults(Array.isArray(found) ? found : []);
    setHasSearched(true);
  }, [departure, destination, date, searchTrips]);

  const handleBook = useCallback(async () => {
    if (!bookingTrip) return;
    setIsBooking(true);
    await createBooking(bookingTrip.id);
    setIsBooking(false);
    setBookingTrip(null);
  }, [bookingTrip, createBooking]);

  // Show all trips from context on mount
  useEffect(() => {
    if (trips.length > 0 || !tripsLoading) {
      setResults(trips);
      setHasSearched(true);
    }
  }, [trips, tripsLoading]);

  return (
    <div className="animate-fade-in">
      <HeroSection />
      <SearchBar
        departure={departure}
        setDeparture={setDeparture}
        destination={destination}
        setDestination={setDestination}
        date={date}
        setDate={setDate}
        onSearch={handleSearch}
      />

      {/* Results */}
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <h2 className="text-2xl font-semibold text-white mb-6">
          {hasSearched ? `Trajets disponibles${results.length > 0 ? ` (${results.length})` : ''}` : 'Trajets disponibles'}
        </h2>

        {hasSearched && results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-covoit-text-secondary text-lg mb-2">Aucun trajet trouvé</p>
            <p className="text-covoit-text-muted text-sm">Essayez d'autres critères de recherche</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {results.map(trip => (
              <TripCard
                key={trip.id}
                trip={trip}
                onBook={(tripId) => {
                  const t = results.find(tr => tr.id === tripId);
                  if (t) setBookingTrip(t);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Booking Confirmation Modal */}
      <Modal
        open={!!bookingTrip}
        onClose={() => setBookingTrip(null)}
        title="Confirmer votre réservation"
      >
        {bookingTrip && (
          <div className="space-y-4">
            <div className="bg-covoit-bg-tertiary rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-covoit-text-secondary text-sm">Trajet</span>
                <span className="text-white font-medium">
                  {bookingTrip.departure} → {bookingTrip.destination}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-covoit-text-secondary text-sm">Date</span>
                <span className="text-white font-medium">{bookingTrip.date} à {bookingTrip.time}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-covoit-text-secondary text-sm">Conducteur</span>
                <span className="text-white font-medium">{bookingTrip.driver.name}</span>
              </div>
              <div className="h-px bg-white/[0.06] my-2" />
              <div className="flex items-center justify-between">
                <span className="text-covoit-text-secondary text-sm">Prix total</span>
                <span className="text-covoit-orange font-bold text-lg">{bookingTrip.price} TND</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setBookingTrip(null)}
                className="btn-ghost flex-1 py-3"
              >
                Annuler
              </button>
              <button
                onClick={handleBook}
                disabled={isBooking}
                className="btn-primary flex-1 py-3 disabled:opacity-50"
              >
                {isBooking ? 'Réservation...' : 'Confirmer'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
