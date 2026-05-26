import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  ArrowLeft,
  BarChart3,
  BadgeCheck,
  ChevronRight,
  CircleDollarSign,
  Flame,
  LineChart,
  Sparkles,
  Star,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { reviewsService, type DriverStats } from '@/services/reviews';
import { useDriverLiveRating, useDriverBadgesLive } from '@/hooks/use-sse';

function StatTile({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="card-surface p-5 rounded-3xl border border-white/10 shadow-xl bg-covoit-bg-secondary">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm text-covoit-text-secondary uppercase tracking-[0.2em]">{label}</p>
        <div className={`p-3 rounded-2xl ${color} text-white`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}


export default function DriverStatsPage() {
  const { id } = useParams();
  const driverId = Number(id ?? 0);
  const { currentUser } = useApp();
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: liveRatingData, isConnected: ratingConnected } = useDriverLiveRating(driverId);
  const { badges: liveBadges, isConnected: badgesConnected } = useDriverBadgesLive(driverId);

  const liveAverage = liveRatingData?.averageRating ?? stats?.averageRating ?? 0;
  const allBadges = useMemo(() => {
    if (!stats) return liveBadges;
    return Array.from(new Set([...(stats.badges || []), ...liveBadges]));
  }, [stats, liveBadges]);

  useEffect(() => {
    if (!id || Number.isNaN(driverId) || driverId <= 0) {
      setError('Identifiant de conducteur invalide.');
      setLoading(false);
      return;
    }

    setLoading(true);
    reviewsService
      .getDriverStats(driverId)
      .then(data => {
        setStats(data);
        setError(null);
      })
      .catch(err => {
        setError('Impossible de charger les statistiques du conducteur.');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [driverId, id]);

  const distribution = useMemo(() => stats?.distribution.slice().sort((a, b) => b.stars - a.stars) ?? [], [stats]);
  const recentAverage = stats?.analytics.lastTenAverage ?? 0;
  const trend = stats?.analytics.trend ?? 'stable';

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 mb-3 text-covoit-text-secondary text-sm">
            <Link to="/trips" className="inline-flex items-center gap-1 text-covoit-text-secondary hover:text-white transition-colors">
              <ArrowLeft size={16} /> Retour
            </Link>
            <ChevronRight size={12} />
            <span>Statistiques conducteur</span>
          </div>
          <h1 className="text-3xl font-semibold text-white">Tableau de bord conducteur</h1>
          <p className="mt-2 text-covoit-text-secondary max-w-2xl">
            Analyse en temps réel des performances du conducteur, des tendances de notation, de la distribution des avis et des badges débloqués.
          </p>
        </div>
        {currentUser && currentUser.id === driverId ? (
          <div className="rounded-3xl bg-white/5 border border-white/10 p-4 text-sm text-covoit-text-secondary">
            Votre profil conducteur<br />ID: {driverId}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatTile label="Note moyenne" value={liveAverage.toFixed(2)} icon={Star} color="bg-covoit-orange" />
            <StatTile label="Avis totaux" value={stats?.totalReviews.toString() ?? '0'} icon={BadgeCheck} color="bg-covoit-blue" />
            <StatTile label="Trajets" value={stats?.totalTrips.toString() ?? '0'} icon={CircleDollarSign} color="bg-covoit-success" />
            <StatTile label="Tendance" value={trend.charAt(0).toUpperCase() + trend.slice(1)} icon={TrendingUp} color="bg-covoit-purple" />
          </div>

          <div className="card-surface p-6 rounded-3xl border border-white/10 shadow-xl bg-covoit-bg-secondary">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-semibold text-white">Performance récente</h2>
                <p className="text-sm text-covoit-text-secondary">Moyenne des 10 derniers avis et tendance du conducteur.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs text-white">
                <Flame size={16} /> {ratingConnected ? 'Live connecté' : 'Mode statique'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-3xl bg-white/5 p-5">
                <p className="text-sm text-covoit-text-secondary mb-2">Dernière moyenne (10 avis)</p>
                <p className="text-4xl font-semibold text-white">{recentAverage.toFixed(2)}</p>
              </div>
              <div className="rounded-3xl bg-white/5 p-5">
                <p className="text-sm text-covoit-text-secondary mb-2">Taux positif</p>
                <p className="text-4xl font-semibold text-white">{stats?.analytics.positiveRate.toFixed(0)}%</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {distribution.map(item => (
                <div key={item.stars}>
                  <div className="flex items-center justify-between mb-2 text-sm text-covoit-text-secondary">
                    <span>
                      {item.stars} étoiles
                    </span>
                    <span>{item.count} avis</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-covoit-orange" style={{ width: `${Math.min((item.count / Math.max(...distribution.map(i => i.count), 1)) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card-surface p-5 rounded-3xl border border-white/10 shadow-xl bg-covoit-bg-secondary">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Top tags</h3>
                  <p className="text-sm text-covoit-text-secondary">Les mots les plus utilisés dans les avis.</p>
                </div>
                <BarChart3 size={20} className="text-covoit-orange" />
              </div>
              <div className="space-y-3">
                {stats?.topTags.map(tag => (
                  <div key={tag.tag} className="flex items-center justify-between rounded-2xl bg-white/5 p-3">
                    <span className="text-sm text-white">#{tag.tag}</span>
                    <span className="text-sm text-covoit-text-secondary">{tag.count}x</span>
                  </div>
                ))}
                {!stats?.topTags.length && <p className="text-sm text-covoit-text-secondary">Aucun tag disponible.</p>}
              </div>
            </div>

            <div className="card-surface p-5 rounded-3xl border border-white/10 shadow-xl bg-covoit-bg-secondary">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Moyennes mensuelles</h3>
                  <p className="text-sm text-covoit-text-secondary">Evolution des notes mois par mois.</p>
                </div>
                <LineChart size={20} className="text-covoit-blue" />
              </div>
              <div className="space-y-3">
                {stats?.analytics.monthlyAverages.map(item => (
                  <div key={item.month} className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 p-3">
                    <div>
                      <p className="text-sm text-white">{item.month}</p>
                      <p className="text-xs text-covoit-text-secondary">{item.count} avis</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white">{item.avg.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                {!stats?.analytics.monthlyAverages.length && <p className="text-sm text-covoit-text-secondary">Pas encore de données mensuelles.</p>}
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card-surface p-5 rounded-3xl border border-white/10 shadow-xl bg-covoit-bg-secondary">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-semibold text-white">Badges débloqués</h2>
                <p className="text-sm text-covoit-text-secondary">Surveillez les récompenses en direct.</p>
              </div>
              <Sparkles size={20} className="text-covoit-purple" />
            </div>
            <div className="space-y-3">
              {allBadges.length > 0 ? (
                allBadges.map(badge => (
                  <div key={badge} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
                    <Trophy size={18} className="text-covoit-orange" />
                    <span className="text-sm text-white">{badge}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-covoit-text-secondary">Aucun badge débloqué pour l'instant.</p>
              )}
            </div>
            <div className="mt-4 rounded-3xl bg-white/5 p-4 text-sm text-covoit-text-secondary">
              {badgesConnected ? 'Flux badges actif' : 'Flux badges inactif'}
            </div>
          </div>

          <div className="card-surface p-5 rounded-3xl border border-white/10 shadow-xl bg-covoit-bg-secondary">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-semibold text-white">Live feed</h2>
                <p className="text-sm text-covoit-text-secondary">Mises à jour en temps réel à chaque nouvel avis ou badge.</p>
              </div>
              <TrendingUp size={20} className="text-covoit-success" />
            </div>

            <div className="rounded-3xl bg-white/5 p-4 space-y-4">
              <div className="rounded-3xl bg-covoit-bg p-4 border border-white/10">
                <p className="text-xs uppercase text-covoit-text-secondary mb-2">Note en direct</p>
                <p className="text-2xl font-semibold text-white">{liveAverage.toFixed(2)}</p>
                <p className="text-sm text-covoit-text-secondary">Dernière moyenne reçue en temps réel.</p>
              </div>

              <div className="rounded-3xl bg-covoit-bg p-4 border border-white/10">
                <p className="text-xs uppercase text-covoit-text-secondary mb-2">Dernier badge</p>
                {liveBadges.length > 0 ? (
                  <div className="flex items-center gap-3">
                    <Sparkles size={18} className="text-covoit-orange" />
                    <div>
                      <p className="text-sm text-white">{liveBadges[0]}</p>
                      <p className="text-xs text-covoit-text-secondary">Badge débloqué en direct</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-covoit-text-secondary">Aucun nouvel badge pour l'instant.</p>
                )}
              </div>
            </div>
          </div>

          <div className="card-surface p-5 rounded-3xl border border-white/10 shadow-xl bg-covoit-bg-secondary">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Actions rapides</h3>
                <p className="text-sm text-covoit-text-secondary">Gérez votre tableau de bord conducteur.</p>
              </div>
            </div>
            <div className="space-y-3">
              <Link
                to={`/driver/${driverId}/stats`}
                className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:border-covoit-orange hover:bg-white/10 transition"
              >
                Rafraîchir la page
              </Link>
              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-covoit-orange px-4 py-3 text-sm font-medium text-white hover:bg-orange-400 transition"
                onClick={() => window.location.reload()}
              >
                <ArrowLeft size={16} /> Recharger
              </button>
            </div>
          </div>
        </aside>
      </div>

      {loading && (
        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-white/80">
          Chargement des statistiques...
        </div>
      )}
      {error && !loading && (
        <div className="mt-8 rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-100">
          {error}
        </div>
      )}
    </div>
  );
}
