import { useState, useEffect } from 'react';
import { Mail, Phone, Star, Save, Lock, User, Shield } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import UserAvatar from '@/components/UserAvatar';
import StarRating from '@/components/StarRating';
import { mockReviews } from '@/data/mockData';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

function ReviewCard({ review }: { review: typeof mockReviews[0] }) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <StarRating rating={review.rating} showNumber size={14} />
        </div>
        <span className="text-xs text-covoit-text-muted">
          {format(parseISO(review.createdAt), 'd MMM yyyy', { locale: fr })}
        </span>
      </div>
      <p className="text-sm text-covoit-text-secondary mb-3">{review.comment}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-covoit-text-secondary">{review.reviewerName}</span>
        <div className="flex flex-wrap gap-1.5">
          {review.tags.map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full bg-covoit-bg-tertiary text-covoit-text-muted text-[10px] font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Profil() {
  const { currentUser, updateProfile, changePassword } = useApp();
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  // Redirect if not authenticated
  if (!currentUser) {
    return (
      <div className="max-w-[800px] mx-auto px-6 py-10">
        <div className="text-center">
          <p className="text-covoit-text-secondary mb-4">Veuillez vous connecter pour accéder à votre profil</p>
        </div>
      </div>
    );
  }

  // Sync form fields when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
    }
  }, [currentUser?.id]); // Depend on ID to detect user changes

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      await updateProfile({ name, email, phone });
    } catch (err: any) {
      // Extract error message
      let errorMessage = 'Erreur lors de la mise à jour';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.errors) {
        if (Array.isArray(err.response.data.errors)) {
          errorMessage = err.response.data.errors.map((e: any) => e.message || String(e)).join(', ');
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Tous les champs du mot de passe sont obligatoires.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Le nouveau mot de passe et sa confirmation ne correspondent pas.');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('Le nouveau mot de passe doit etre different de l\'actuel.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (err: any) {
      let errorMessage = 'Erreur lors de la modification du mot de passe';

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setPasswordError(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-[800px] mx-auto px-6 py-10 animate-fade-in">
      <h1 className="text-3xl font-semibold text-white mb-8">Mon Profil</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        {/* Left Column - Profile Info */}
        <div className="space-y-6">
          <div className="card-surface p-6 text-center">
            <div className="inline-block mb-4">
              <UserAvatar name={currentUser.name} size={120} showRing />
            </div>
            <h2 className="text-xl font-semibold text-white mb-1">{currentUser.name}</h2>
            <p className="text-sm text-covoit-text-secondary mb-3">{currentUser.email}</p>

            <div className="flex items-center justify-center gap-1 mb-2">
              <StarRating rating={currentUser.rating} showNumber size={16} />
            </div>

            <div className="space-y-2 mt-4 pt-4 border-t border-white/[0.04]">
              <div className="flex items-center gap-2 text-sm text-covoit-text-secondary justify-center">
                <Mail size={14} className="text-covoit-text-muted" />
                {currentUser.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-covoit-text-secondary justify-center">
                <Phone size={14} className="text-covoit-text-muted" />
                {currentUser.phone}
              </div>
            </div>

            {currentUser.emergencyContact && (
              <div className="mt-4 pt-4 border-t border-white/[0.04]">
                <div className="flex items-center gap-1.5 justify-center text-xs text-covoit-text-muted mb-1">
                  <Shield size={12} />
                  Contact d'urgence
                </div>
                <p className="text-sm text-covoit-text-secondary">{currentUser.emergencyContact}</p>
                <p className="text-xs text-covoit-text-muted">{currentUser.emergencyPhone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Edit Form */}
        <div className="space-y-8">
          <div className="card-surface p-6">
            <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
              <User size={18} className="text-covoit-orange" />
              Modifier le profil
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-400 mb-1">Erreur</p>
                    <p className="text-sm text-red-300/80">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setError('')}
                    className="text-red-400 hover:text-red-300 text-lg leading-none"
                  >
                    ✕
                  </button>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-covoit-text-secondary mb-1.5">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-covoit-text-secondary mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-covoit-text-secondary mb-1.5">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="input-field"
                />
              </div>

              {/* Password Section Toggle */}
              <button
                type="button"
                onClick={() => {
                  setShowPasswordSection(!showPasswordSection);
                  setPasswordError('');
                }}
                className="flex items-center gap-2 text-sm text-covoit-orange hover:underline"
              >
                <Lock size={14} />
                {showPasswordSection ? 'Masquer' : 'Changer le mot de passe'}
              </button>

              {showPasswordSection && (
                <div className="space-y-4 p-4 rounded-xl bg-covoit-bg-tertiary">
                  {passwordError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300/90">
                      {passwordError}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-covoit-text-secondary mb-1.5">
                      Mot de passe actuel
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="********"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-covoit-text-secondary mb-1.5">
                      Nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="********"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-covoit-text-secondary mb-1.5">
                      Confirmer le nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="********"
                      className="input-field"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handlePasswordChange}
                    disabled={isChangingPassword}
                    className="btn-primary flex items-center gap-2 py-2.5 px-5 disabled:opacity-50"
                  >
                    <Lock size={16} />
                    {isChangingPassword ? 'Modification...' : 'Modifier le mot de passe'}
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary flex items-center gap-2 py-3 px-6 disabled:opacity-50"
              >
                <Save size={16} />
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </form>
          </div>

          {/* Reviews Section */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Star size={18} className="text-covoit-orange" />
              Avis reçus
            </h3>
            {mockReviews.length === 0 ? (
              <p className="text-sm text-covoit-text-secondary">Aucun avis pour le moment</p>
            ) : (
              <div className="space-y-4">
                {mockReviews.map(review => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
