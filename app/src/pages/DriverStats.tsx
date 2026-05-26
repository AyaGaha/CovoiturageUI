import { useState, useEffect } from 'react';
import { Star, TrendingUp, AlertCircle, Award, MessageSquare, Calendar } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { reviewsService, tripsService } from '@/services';
import type { DriverStats as DriverStatsType, Review } from '@/types';
import type { TripStatsResponse } from '@/services/trips';
import StarRating from '@/components/StarRating';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const badgeColors: Record<string, string> = {
  PUNCTUAL: 'bg-blue-500/20 text-blue-200 border border-blue-500/30',
  FRIENDLY: 'bg-green-500/20 text-green-200 border border-green-500/30',
  CLEAN_CAR: 'bg-purple-500/20 text-purple-200 border border-purple-500/30',
  RESPECTFUL: 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30',
  SAFE_DRIVER: 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30',
};

function StatCard({ label, value, unit, icon: Icon }: { label: string; value: number; unit?: string; icon: React.ReactNode }) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-covoit-text-muted uppercase tracking-wide mb-1">{label}</p>
          <p className="text-2xl font-semibold text-white">
            {value.toFixed(1)} <span className="text-lg text-covoit-text-secondary">{unit}</span>
          </p>
        </div>
        <div className="p-2.5 rounded-lg bg-covoit-orange/10 text-covoit-orange">{Icon}</div>
      </div>
    </div>
  );
}

export default function DriverStats() {
  const { currentUser } = useApp();
  const [driverStats, setDriverStats] = useState<DriverStatsType | null>(null);
  const [tripStats, setTripStats] = useState<TripStatsResponse | null>(null);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      if (!currentUser) {
        setError('Vous devez être connecté');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const [stats, trips, reviews] = await Promise.all([
          reviewsService.getDriverStats(currentUser.id),
          tripsService.getTripStats(),
          reviewsService.getMyReviews(),
        ]);
        setDriverStats(stats);
        setTripStats(trips);
        setMyReviews(reviews);
        setError(null);
      } catch (err) {
        console.error('Failed to load driver stats:', err);
        setError('Impossible de charger les statistiques');
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [currentUser]);

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 animate-fade-in">
      <h1 className="text-3xl font-semibold text-white mb-2">Mes Statistiques de Conducteur</h1>
      <p className="text-covoit-text-secondary mb-8">Consultez vos performances et avis des passagers</p>

      {error && (
        <div className="card-surface p-4 mb-8 border-l-4 border-red-500">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {!currentUser && (
        <div className="card-surface p-6 text-center">
          <AlertCircle size={32} className="mx-auto text-yellow-500 mb-3" />
          <p className="text-covoit-text-secondary">Vous devez être connecté pour voir vos statistiques</p>
        </div>
      )}

      {isLoading && (
        <div className="text-center text-covoit-text-secondary py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-covoit-orange mb-3" />
          <p>Chargement de vos statistiques...</p>
        </div>
      )}

      {!isLoading && currentUser && driverStats && tripStats && (
        <>
          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard 
              label="Note moyenne" 
              value={driverStats.averageRating} 
              unit="/5"
              icon={<Star size={20} />}
            />
            <StatCard 
              label="Avis reçus" 
              value={driverStats.totalReviews}
              icon={<MessageSquare size={20} />}
            />
            <StatCard 
              label="Trajets complétés" 
              value={driverStats.completedTrips}
              icon={<Calendar size={20} />}
            />
            <StatCard 
              label="Taux positif" 
              value={Math.round(driverStats.analytics.positiveRate)} 
              unit="%"
              icon={<TrendingUp size={20} />}
            />
          </div>

          {/* Trip Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="card-surface p-6">
              <p className="text-xs text-covoit-text-muted uppercase tracking-wide mb-2">Trajets totaux</p>
              <p className="text-3xl font-semibold text-white mb-3">{driverStats.totalTrips}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-covoit-text-secondary">
                  <span>Actifs</span>
                  <span className="text-white font-medium">{driverStats.activeTrips}</span>
                </div>
                <div className="flex justify-between text-covoit-text-secondary">
                  <span>Complétés</span>
                  <span className="text-white font-medium">{driverStats.completedTrips}</span>
                </div>
                <div className="flex justify-between text-covoit-text-secondary">
                  <span>Annulés</span>
                  <span className="text-white font-medium">{driverStats.cancelledTrips}</span>
                </div>
              </div>
            </div>

            {/* Distribution */}
            <div className="card-surface p-6">
              <p className="text-xs text-covoit-text-muted uppercase tracking-wide mb-4">Distribution des notes</p>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map(star => {
                  const data = driverStats.distribution.find(d => d.stars === star);
                  const count = data?.count || 0;
                  const percentage = driverStats.totalReviews ? (count / driverStats.totalReviews) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs text-covoit-text-secondary w-3">{star}</span>
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-covoit-orange rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-covoit-text-muted w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Analytics */}
            <div className="card-surface p-6">
              <p className="text-xs text-covoit-text-muted uppercase tracking-wide mb-4">Analytique</p>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-covoit-text-secondary">10 derniers avis</span>
                    <span className="text-sm font-semibold text-white">{driverStats.analytics.lastTenAverage.toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(driverStats.analytics.lastTenAverage / 5) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                  <span className="text-xs text-covoit-text-secondary">Tendance</span>
                  <span className={`text-sm font-medium flex items-center gap-1 ${
                    driverStats.analytics.trend === 'up' ? 'text-green-400' :
                    driverStats.analytics.trend === 'down' ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>
                    {driverStats.analytics.trend === 'up' ? '↑ Hausse' :
                     driverStats.analytics.trend === 'down' ? '↓ Baisse' :
                     '→ Stable'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Badges */}
          {driverStats.badges.length > 0 && (
            <div className="card-surface p-6 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Award size={20} className="text-covoit-orange" />
                <h3 className="text-lg font-semibold text-white">Badges Obtenus</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {driverStats.badges.map(badge => (
                  <div
                    key={badge}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${badgeColors[badge] || 'bg-gray-500/20 text-gray-200'}`}
                  >
                    {badge}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Tags */}
          <div className="card-surface p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Tags les Plus Fréquents</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {driverStats.topTags.map(tag => (
                <div key={tag.tag} className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <p className="text-sm font-medium text-white mb-1">{tag.tag}</p>
                  <p className="text-2xl font-semibold text-covoit-orange">{tag.count}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Chart */}
          <div className="card-surface p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-6">Évolution Mensuelle</h3>
            <div className="space-y-4">
              {driverStats.analytics.monthlyAverages.map((month, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-covoit-text-secondary">{month.month}</span>
                    <span className="text-sm font-medium text-white">{month.avg.toFixed(1)}/5 ({month.count} avis)</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-covoit-orange to-orange-400 rounded-full transition-all duration-300"
                      style={{ width: `${(month.avg / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Reviews */}
          <div className="card-surface p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Avis Récents</h3>
            <div className="space-y-4">
              {mockReviews.slice(0, 3).map(review => (
                <div key={review.id} className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-covoit-orange/20 flex items-center justify-center text-covoit-orange font-semibold">
                        {review.reviewerName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{review.reviewerName}</p>
                        <p className="text-xs text-covoit-text-muted">{format(parseISO(review.createdAt), 'd MMM yyyy', { locale: fr })}</p>
                      </div>
                    </div>
                    <StarRating rating={review.rating} showNumber size={12} />
                  </div>
                  <p className="text-sm text-covoit-text-secondary mb-2">{review.comment}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {review.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-covoit-bg-tertiary text-covoit-text-muted text-[10px] font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
