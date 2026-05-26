import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import Modal from './Modal';
import { CarFront } from 'lucide-react';

export default function AuthModal() {
  const { authModal, setAuthModal, login, register, authLoading } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password, phone);
      }
      // Modal will close automatically via context
      setEmail('');
      setPassword('');
      setName('');
      setPhone('');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    }
  };

  return (
    <Modal open={authModal} onClose={() => setAuthModal(false)} maxWidth="420px">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl gradient-orange mb-3">
          <CarFront size={24} className="text-white" />
        </div>
        <h2 className="text-xl font-semibold text-white">
          {isLogin ? 'Connexion' : 'Créer un compte'}
        </h2>
        <p className="text-sm text-covoit-text-secondary mt-1">
          {isLogin
            ? 'Connectez-vous pour accéder à votre compte'
            : 'Rejoignez la communauté Covoiturage'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {!isLogin && (
          <div>
            <label className="block text-xs font-medium text-covoit-text-secondary mb-1.5">
              Nom complet
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Votre nom"
              className="input-field"
              required
              disabled={authLoading}
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-covoit-text-secondary mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="exemple@email.tn"
            className="input-field"
            required
            disabled={authLoading}
          />
        </div>

        {!isLogin && (
          <div>
            <label className="block text-xs font-medium text-covoit-text-secondary mb-1.5">
              Téléphone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+216 XX XXX XXX"
              className="input-field"
              disabled={authLoading}
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-covoit-text-secondary mb-1.5">
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input-field"
            required
            disabled={authLoading}
          />
        </div>

        <button 
          type="submit" 
          className="w-full btn-primary py-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={authLoading}
        >
          {authLoading ? 'Chargement...' : (isLogin ? 'Se connecter' : 'Créer mon compte')}
        </button>
      </form>

      <p className="text-center text-sm text-covoit-text-secondary mt-5">
        {isLogin ? "Vous n'avez pas de compte ?" : 'Vous avez déjà un compte ?'}{' '}
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-covoit-orange hover:underline font-medium"
        >
          {isLogin ? "S'inscrire" : 'Se connecter'}
        </button>
      </p>
    </Modal>
  );
}
