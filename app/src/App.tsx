import { Routes, Route } from 'react-router';
import { AppProvider, useApp } from '@/context/AppContext';
import Navbar from '@/components/Navbar';
import NotificationsPanel from '@/components/NotificationsPanel';
import AuthModal from '@/components/AuthModal';
import ToastNotifications from '@/components/ToastNotifications';
import Home from '@/pages/Home';
import Reservations from '@/pages/Reservations';
import Trips from '@/pages/Trips';
import Alertes from '@/pages/Alertes';
import Profil from '@/pages/Profil';

function AppShell({ children }: { children: React.ReactNode }) {
  const { notifications, dismissNotification } = useApp();

  return (
    <div className="min-h-screen bg-covoit-bg">
      <Navbar />
      <main className="pt-[72px]">{children}</main>
      <NotificationsPanel />
      <AuthModal />
      <ToastNotifications
        notifications={notifications.filter(n => !n.read).slice(0, 4)}
        onDismiss={dismissNotification}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/trips" element={<Trips />} />
          <Route path="/alertes" element={<Alertes />} />
          <Route path="/profil" element={<Profil />} />
        </Routes>
      </AppShell>
    </AppProvider>
  );
}
