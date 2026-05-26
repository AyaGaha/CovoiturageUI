import { NavLink, useLocation } from 'react-router';
import { CarFront, Bell, Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';

const navLinks = [
  { to: '/', label: 'Rechercher' },
  // These links only show for authenticated users
  { to: '/reservations', label: 'Mes Réservations', auth: true },
  { to: '/trips', label: 'Mes Trajets', auth: true },
  { to: '/alertes', label: 'Alertes', auth: true },
  { to: '/profil', label: 'Profil', auth: true },
];

export default function Navbar() {
  const { unreadCount, setPanelOpen, setAuthModal, setAuthMode, isAuthenticated, currentUser, logout } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 h-[72px] glass-navbar z-50">
      <div className="max-w-[1200px] mx-auto h-full px-6 flex items-center justify-between">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2 shrink-0">
          <CarFront size={24} className="text-covoit-orange" />
          <span className="text-xl font-semibold text-white">Covoiturage</span>
        </NavLink>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks
            .filter(link => !link.auth || isAuthenticated)
            .map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `relative px-4 py-2 text-sm font-medium transition-colors duration-200 rounded-lg ${
                  isActive
                    ? 'text-white'
                    : 'text-covoit-text-secondary hover:text-white hover:bg-white/5'
                }`
              }
            >
              {link.label}
              {location.pathname === link.to && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-covoit-orange rounded-full" />
              )}
            </NavLink>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <button
            onClick={() => setPanelOpen(true)}
            className="relative p-2 rounded-lg hover:bg-white/10 transition-colors text-covoit-text-secondary hover:text-white"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Desktop Auth Buttons */}
          {!isAuthenticated ? (
            <div className="hidden sm:flex items-center gap-2">
              <button 
                onClick={() => {
                  setAuthMode('login');
                  setAuthModal(true);
                }}
                className="btn-ghost text-sm py-2.5 px-4"
              >
                Connexion
              </button>
              <button 
                onClick={() => {
                  setAuthMode('register');
                  setAuthModal(true);
                }}
                className="btn-primary text-sm py-2.5 px-4 gradient-orange"
              >
                S'inscrire
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-covoit-text-secondary">
                {currentUser?.name}
              </span>
              <button
                onClick={() => logout()}
                className="btn-ghost text-sm py-2.5 px-4 flex items-center gap-2"
              >
                <LogOut size={16} />
                Déconnexion
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors text-covoit-text-secondary"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden glass-panel border-t border-white/[0.06] animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {navLinks
              .filter(link => !link.auth || isAuthenticated)
              .map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-white bg-covoit-orange/15'
                      : 'text-covoit-text-secondary hover:text-white hover:bg-white/5'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06] mt-2">
              {!isAuthenticated ? (
                <>
                  <button 
                    onClick={() => {
                      setAuthMode('login');
                      setAuthModal(true);
                      setMobileMenuOpen(false);
                    }}
                    className="btn-ghost text-sm py-2.5 flex-1"
                  >
                    Connexion
                  </button>
                  <button 
                    onClick={() => {
                      setAuthMode('register');
                      setAuthModal(true);
                      setMobileMenuOpen(false);
                    }}
                    className="btn-primary text-sm py-2.5 flex-1 gradient-orange"
                  >
                    S'inscrire
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="btn-ghost text-sm py-2.5 flex-1 flex items-center justify-center gap-2"
                >
                  <LogOut size={16} />
                  Déconnexion
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
