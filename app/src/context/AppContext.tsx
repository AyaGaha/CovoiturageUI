import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { Trip, Booking, Alert, Notification, User, BookingRequest, BookingStatus } from '@/types';
import {
  currentUser,
  mockTrips,
  mockBookings,
  mockAlerts,
  mockNotifications,
  driverTrips,
  mockBookingRequests,
} from '@/data/mockData';
import { authService } from '@/services/auth';
import { tripsService } from '@/services/trips';
import { bookingsService } from '@/services/bookings';
import { alertsService } from '@/services/alerts';
import { usersService } from '@/services/users';

interface AppContextType {
  // Auth
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  authModal: boolean;
  setAuthModal: (open: boolean) => void;
  authLoading: boolean;

  // Trips
  trips: Trip[];
  driverTrips: Trip[];
  tripsLoading: boolean;
  searchTrips: (departure: string, destination: string, date: string) => Promise<Trip[]>;
  createTrip: (data: any) => Promise<Trip>;
  updateTrip: (tripId: number, data: any) => Promise<Trip>;
  cancelTrip: (tripId: number) => Promise<void>;

  // Bookings
  bookings: Booking[];
  bookingsLoading: boolean;
  createBooking: (tripId: number) => Promise<void>;
  cancelBooking: (bookingId: number) => Promise<void>;

  // Driver requests
  bookingRequests: BookingRequest[];
  confirmBooking: (bookingId: number) => Promise<void>;
  rejectBooking: (bookingId: number) => Promise<void>;

  // Alerts
  alerts: Alert[];
  alertsLoading: boolean;
  createAlert: (departure: string, destination: string, date?: string) => Promise<void>;
  deleteAlert: (alertId: number) => Promise<void>;

  // Notifications
  notifications: Notification[];
  unreadCount: number;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  markAsRead: (notificationId: number) => void;
  markAllAsRead: () => void;
  dismissNotification: (notificationId: number) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;

  // Profile
  updateProfile: (data: Partial<User>) => Promise<void>;
  profileLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Auth
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [authModal, setAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Trips
  const [trips, setTrips] = useState<Trip[]>(mockTrips);
  const [driverTripsState, setDriverTripsState] = useState<Trip[]>(driverTrips);
  const [tripsLoading, setTripsLoading] = useState(false);

  // Bookings
  const [bookings, setBookings] = useState<Booking[]>(mockBookings);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Driver requests
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>(mockBookingRequests);

  // Alerts
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [panelOpen, setPanelOpen] = useState(false);

  // Profile
  const [profileLoading, setProfileLoading] = useState(false);

  const [userState, setUserState] = useState<User | null>(authService.getStoredUser() || currentUser);

  const notificationIdRef = useRef(4);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Notification functions - defined early so they can be used in callbacks
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      read: false,
      id: notificationIdRef.current++,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const markAsRead = useCallback((notificationId: number) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const dismissNotification = useCallback((notificationId: number) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Initialize data on mount
  useEffect(() => {
    const initializeApp = async () => {
      if (isAuthenticated) {
        try {
          // Load user profile
          const userProfile = await usersService.getMe();
          setUserState(userProfile as User);

          // Load trips
          await loadTrips();

          // Load bookings
          await loadBookings();

          // Load alerts
          await loadAlerts();
        } catch (error) {
          console.error('Failed to initialize app:', error);
          // Fall back to mock data
        }
      }
    };

    initializeApp();
  }, [isAuthenticated]);

  const loadTrips = async () => {
    try {
      setTripsLoading(true);
      const { trips: allTrips } = await tripsService.getTrips();
      setTrips(allTrips);

      if (isAuthenticated) {
        const myTrips = await tripsService.getMyTrips();
        setDriverTripsState(myTrips);
      }
    } catch (error) {
      console.error('Failed to load trips:', error);
    } finally {
      setTripsLoading(false);
    }
  };

  const loadBookings = async () => {
    try {
      setBookingsLoading(true);
      const myBookings = await bookingsService.getMyBookings();
      setBookings(myBookings);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setBookingsLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      setAlertsLoading(true);
      const userAlerts = await alertsService.getAlerts();
      setAlerts(userAlerts);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setAlertsLoading(false);
    }
  };


  const login = useCallback(async (email: string, password: string) => {
    try {
      setAuthLoading(true);
      const response = await authService.login({ email, password });
      setUserState(response.user as User);
      setIsAuthenticated(true);
      setAuthModal(false);
      addNotification({
        type: 'success',
        message: 'Connexion réussie',
        details: `Bienvenue ${response.user.name}`,
      });
      await loadTrips();
      await loadBookings();
      await loadAlerts();
    } catch (error: any) {
      console.error('Login failed:', error);
      addNotification({
        type: 'error',
        message: 'Erreur de connexion',
        details: error.response?.data?.message || 'Identifiants invalides',
      });
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, phone?: string) => {
    try {
      setAuthLoading(true);
      const response = await authService.register({ name, email, password, phone });
      setUserState(response.user as User);
      setIsAuthenticated(true);
      setAuthModal(false);
      addNotification({
        type: 'success',
        message: 'Inscription réussie',
        details: `Bienvenue ${response.user.name}`,
      });
      await loadTrips();
      await loadBookings();
    } catch (error: any) {
      console.error('Registration failed:', error);
      addNotification({
        type: 'error',
        message: 'Erreur d\'inscription',
        details: error.response?.data?.message || 'Veuillez vérifier vos données',
      });
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setAuthLoading(true);
      await authService.logout();
      setUserState(null);
      setIsAuthenticated(false);
      setTrips([]);
      setBookings([]);
      setAlerts([]);
      addNotification({
        type: 'success',
        message: 'Déconnexion réussie',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const searchTrips = useCallback(async (departure: string, destination: string, date: string) => {
    try {
      return await tripsService.searchTrips({
        departure: departure || undefined,
        destination: destination || undefined,
      });
    } catch (error) {
      console.error('Search trips failed:', error);
      return trips.filter(trip => {
        const matchDeparture = !departure || trip.departure.toLowerCase().includes(departure.toLowerCase());
        const matchDestination = !destination || trip.destination.toLowerCase().includes(destination.toLowerCase());
        const matchDate = !date || trip.date === date;
        return matchDeparture && matchDestination && matchDate && trip.status === 'active';
      });
    }
  }, [trips]);

  const createBooking = useCallback(async (tripId: number) => {
    try {
      const booking = await bookingsService.createBooking(tripId);
      const trip = trips.find(t => t.id === tripId);
      if (trip) {
        const newBooking: Booking = {
          id: booking.id,
          passengerId: booking.passengerId,
          tripId: booking.tripId,
          trip,
          status: booking.status as BookingStatus,
          createdAt: booking.createdAt,
        };
        setBookings(prev => [newBooking, ...prev]);
        addNotification({
          type: 'success',
          message: 'Réservation effectuée',
          details: `Trajet ${trip.departure} → ${trip.destination}`,
        });
      }
    } catch (error: any) {
      console.error('Create booking failed:', error);
      addNotification({
        type: 'error',
        message: 'Erreur de réservation',
        details: error.response?.data?.message || 'Impossible de réserver ce trajet',
      });
      throw error;
    }
  }, [trips, addNotification]);

  const cancelBooking = useCallback(async (bookingId: number) => {
    try {
      await bookingsService.cancelBooking(bookingId);
      setBookings(prev =>
        prev.map(b =>
          b.id === bookingId
            ? { ...b, status: 'cancelled' as BookingStatus, cancelReason: 'Annulée par le passager' }
            : b
        )
      );
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        addNotification({
          type: 'error',
          message: 'Réservation annulée',
          details: `Trajet ${booking.trip.departure} → ${booking.trip.destination}`,
        });
      }
    } catch (error: any) {
      console.error('Cancel booking failed:', error);
      addNotification({
        type: 'error',
        message: 'Erreur lors de l\'annulation',
        details: error.response?.data?.message || 'Impossible d\'annuler la réservation',
      });
      throw error;
    }
  }, [bookings, addNotification]);

  const confirmBooking = useCallback(async (bookingId: number) => {
    try {
      await bookingsService.confirmBooking(bookingId);
      setBookingRequests(prev => prev.filter(r => r.id !== bookingId));
      addNotification({
        type: 'success',
        message: 'Demande acceptée',
        details: 'La réservation a été confirmée',
      });
    } catch (error: any) {
      console.error('Confirm booking failed:', error);
      addNotification({
        type: 'error',
        message: 'Erreur lors de la confirmation',
        details: error.response?.data?.message || 'Impossible de confirmer la réservation',
      });
      throw error;
    }
  }, [addNotification]);

  const rejectBooking = useCallback(async (bookingId: number) => {
    try {
      await bookingsService.rejectBooking(bookingId);
      setBookingRequests(prev => prev.filter(r => r.id !== bookingId));
      addNotification({
        type: 'error',
        message: 'Demande refusée',
        details: 'La réservation a été refusée',
      });
    } catch (error: any) {
      console.error('Reject booking failed:', error);
      addNotification({
        type: 'error',
        message: 'Erreur lors du refus',
        details: error.response?.data?.message || 'Impossible de refuser la réservation',
      });
      throw error;
    }
  }, [addNotification]);

  const createAlert = useCallback(async (departure: string, destination: string, date?: string) => {
    try {
      const alert = await alertsService.createAlert({ departure, destination, date });
      setAlerts(prev => [alert, ...prev]);
      addNotification({
        type: 'success',
        message: 'Alerte créée',
        details: `${departure} → ${destination}${date ? `, ${date}` : ''}`,
      });
    } catch (error: any) {
      console.error('Create alert failed:', error);
      addNotification({
        type: 'error',
        message: 'Erreur lors de la création d\'alerte',
        details: error.response?.data?.message || 'Impossible de créer l\'alerte',
      });
      throw error;
    }
  }, [addNotification]);

  const deleteAlert = useCallback(async (alertId: number) => {
    try {
      await alertsService.deleteAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      addNotification({
        type: 'success',
        message: 'Alerte supprimée',
      });
    } catch (error: any) {
      console.error('Delete alert failed:', error);
      addNotification({
        type: 'error',
        message: 'Erreur lors de la suppression',
        details: error.response?.data?.message || 'Impossible de supprimer l\'alerte',
      });
      throw error;
    }
  }, [addNotification]);

  const createTrip = useCallback(async (data: any) => {
    try {
      const trip = await tripsService.createTrip(data);
      setDriverTripsState(prev => [trip, ...prev]);
      addNotification({
        type: 'success',
        message: 'Trajet créé',
        details: `${data.departure} → ${data.destination}`,
      });
      return trip;
    } catch (error: any) {
      console.error('Create trip failed:', error);
      addNotification({
        type: 'error',
        message: 'Erreur lors de la création du trajet',
        details: error.response?.data?.message || 'Impossible de créer le trajet',
      });
      throw error;
    }
  }, [addNotification]);

  const updateTrip = useCallback(async (tripId: number, data: any) => {
    try {
      const trip = await tripsService.updateTrip(tripId, data);
      setDriverTripsState(prev => prev.map(t => (t.id === tripId ? trip : t)));
      addNotification({
        type: 'success',
        message: 'Trajet modifié',
      });
      return trip;
    } catch (error: any) {
      console.error('Update trip failed:', error);
      addNotification({
        type: 'error',
        message: 'Erreur lors de la modification',
        details: error.response?.data?.message || 'Impossible de modifier le trajet',
      });
      throw error;
    }
  }, [addNotification]);

  const cancelTrip = useCallback(async (tripId: number) => {
    try {
      await tripsService.cancelTrip(tripId);
      setDriverTripsState(prev => prev.map(t => (t.id === tripId ? { ...t, status: 'cancelled' } : t)));
      addNotification({
        type: 'success',
        message: 'Trajet annulé',
      });
    } catch (error: any) {
      console.error('Cancel trip failed:', error);
      addNotification({
        type: 'error',
        message: 'Erreur lors de l\'annulation du trajet',
        details: error.response?.data?.message || 'Impossible d\'annuler le trajet',
      });
      throw error;
    }
  }, [addNotification]);


  const updateProfile = useCallback(async (data: Partial<User>) => {
    try {
      setProfileLoading(true);
      const updated = await usersService.updateProfile(data);
      setUserState(prev => (prev ? { ...prev, ...updated } : updated as User));
      addNotification({
        type: 'success',
        message: 'Profil mis à jour',
        details: 'Vos informations ont été enregistrées',
      });
    } catch (error: any) {
      console.error('Update profile failed:', error);
      addNotification({
        type: 'error',
        message: 'Erreur lors de la mise à jour du profil',
        details: error.response?.data?.message || 'Impossible de mettre à jour le profil',
      });
      throw error;
    } finally {
      setProfileLoading(false);
    }
  }, [addNotification]);

  return (
    <AppContext.Provider
      value={{
        currentUser: userState,
        isAuthenticated,
        login,
        logout,
        register,
        authModal,
        setAuthModal,
        authLoading,
        trips,
        driverTrips: driverTripsState,
        tripsLoading,
        searchTrips,
        createTrip,
        updateTrip,
        cancelTrip,
        bookings,
        bookingsLoading,
        createBooking,
        cancelBooking,
        bookingRequests,
        confirmBooking,
        rejectBooking,
        alerts,
        alertsLoading,
        createAlert,
        deleteAlert,
        notifications,
        unreadCount,
        panelOpen,
        setPanelOpen,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        addNotification,
        updateProfile,
        profileLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
