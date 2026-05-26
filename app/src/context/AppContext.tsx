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
  authModalMode: 'login' | 'register';
  setAuthModalMode: (mode: 'login' | 'register') => void;
  authLoading: boolean;

  // Trips
  trips: Trip[];
  driverTrips: Trip[];
  tripsLoading: boolean;
  searchTrips: (
  departure: string,
  destination: string,
  date: string,
  rangeDays?: number,
  maxPrice?: number,
  minSeats?: number,
  sortBy?: 'date' | 'price' | 'driverRating',
  sortOrder?: 'ASC' | 'DESC',
  first?: number,
  after?: string,
) => Promise<{ trips: Trip[]; hasNextPage: boolean; endCursor: string | null; totalCount: number }>;
  createTrip: (data: any) => Promise<Trip>;
  updateTrip: (tripId: number, data: any) => Promise<Trip>;
  cancelTrip: (tripId: number) => Promise<void>;
  completeTrip: (tripId: number) => Promise<void>;

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
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState(false);

  // Trips
  const [trips, setTrips] = useState<Trip[]>([]);
  const [driverTripsState, setDriverTripsState] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);

  // Bookings
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Driver requests
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);

  // Alerts
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [panelOpen, setPanelOpen] = useState(false);

  // Restore and persist auth modal state (for handling page reloads during login errors)
  useEffect(() => {
    const savedAuthModal = localStorage.getItem('authModalOpen');
    if (savedAuthModal === 'true') {
      console.log('📝 [AppContext] Restoring authModal state from localStorage');
      setAuthModal(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('authModalOpen', authModal.toString());
    if (!authModal) {
      // Clear error data when modal is fully closed
      localStorage.removeItem('authModalError');
      localStorage.removeItem('authModalEmail');
      localStorage.removeItem('authModalPassword');
      localStorage.removeItem('authModalName');
      localStorage.removeItem('authModalPhone');
    }
  }, [authModal]);

  // Profile
  const [profileLoading, setProfileLoading] = useState(false);

  const [userState, setUserState] = useState<User | null>(authService.getStoredUser() || null);

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

  // Load all trips on app mount (for search page)
  useEffect(() => {
    let isMounted = true;
    const loadPublicTrips = async () => {
      try {
        setTripsLoading(true);
        // Use GraphQL query for upcoming trips
        const trips = await tripsService.getUpcomingTripsGraphQL(1, 50);
        if (isMounted && trips && trips.length > 0) {
          setTrips(trips);
        }
      } catch (error) {
        console.error('Failed to load trips:', error);
        if (isMounted) {
          setTrips([]);
        }
      } finally {
        if (isMounted) {
          setTripsLoading(false);
        }
      }
    };

    loadPublicTrips();
    return () => { isMounted = false; };
  }, []);

  // Initialize authenticated user data
  useEffect(() => {
    const initializeApp = async () => {
      if (isAuthenticated) {
        try {
          // Load user profile
          const userProfile = await usersService.getMe();
          setUserState(userProfile as User);

          // Load user's own trips
          const myTrips = await tripsService.getMyTrips();
          setDriverTripsState(myTrips);

          // Load bookings
          await loadBookings();

          // Load alerts
          await loadAlerts();
        } catch (error) {
          console.error('Failed to initialize app:', error);
          // Fall back gracefully
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

  const loadBookingRequests = async () => {
    try {
      // Only load if we have driver trips
      if (driverTripsState.length === 0) {
        setBookingRequests([]);
        return;
      }

      const allRequests: BookingRequest[] = [];

      // Fetch pending bookings for each driver's trip
      for (const trip of driverTripsState) {
        try {
          const pending = await bookingsService.getPendingBookings(trip.id);
          allRequests.push(...pending);
        } catch (error) {
          console.warn(`Failed to load pending bookings for trip ${trip.id}:`, error);
          // Continue with other trips if one fails
        }
      }

      setBookingRequests(allRequests);
    } catch (error) {
      console.error('Failed to load booking requests:', error);
      // Don't fail the whole operation if booking requests fail
    }
  };

  // Load booking requests whenever driver trips change
  useEffect(() => {
    if (isAuthenticated && driverTripsState.length > 0) {
      loadBookingRequests();
    }
  }, [driverTripsState, isAuthenticated]);


  const login = useCallback(async (email: string, password: string) => {
    const debugLog = (msg: string) => {
      console.log(msg);
      const logs = JSON.parse(localStorage.getItem('authDebugLogs') || '[]');
      logs.push({ time: new Date().toLocaleTimeString(), msg });
      localStorage.setItem('authDebugLogs', JSON.stringify(logs.slice(-50)));
    };
    
    debugLog('🔐 [AppContext] login() called with email: ' + email);
    try {
      setAuthLoading(true);
      debugLog('🔐 [AppContext] Calling authService.login()...');
      const response = await authService.login({ email, password });
      debugLog('✅ [AppContext] authService.login() succeeded: ' + response.user.name);
      setUserState(response.user as User);
      debugLog('✅ [AppContext] Setting isAuthenticated = true');
      setIsAuthenticated(true);
      debugLog('✅ [AppContext] Closing modal with setAuthModal(false)');
      setAuthModal(false);
      // Data will be loaded by useEffect when isAuthenticated changes
    } catch (error: any) {
      debugLog('❌ [AppContext] login() failed: ' + error.message);
      debugLog('❌ [AppContext] Error status: ' + error.response?.status);
      debugLog('❌ [AppContext] Error message: ' + error.response?.data?.message);
      debugLog('❌ [AppContext] Throwing error to AuthModal...');
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
      
      // Show success notification
      addNotification({
        type: 'success',
        message: 'Bienvenue sur Wassalni !',
        details: `Compte créé avec succès, ${name.split(' ')[0]}! Connecté automatiquement.`,
      });
      
      // Data will be loaded by useEffect when isAuthenticated changes
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }, [addNotification]);

  const logout = useCallback(async () => {
    try {
      setAuthLoading(true);
      await authService.logout();
      setUserState(null);
      setIsAuthenticated(false);
      setDriverTripsState([]);
      setBookings([]);
      setAlerts([]);
      
      // Charger les trajets publics depuis l'API
      try {
        const { trips: allTrips } = await tripsService.getTrips();
        setTrips(allTrips);
      } catch (error) {
        console.error('Failed to reload public trips:', error);
        setTrips([]);
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setAuthLoading(false);
    }
  }, [addNotification]);

  const searchTrips = useCallback(async (
  departure: string,
  destination: string,
  date: string,
  rangeDays?: number,
  maxPrice?: number,
  minSeats?: number,
  sortBy?: 'date' | 'price' | 'driverRating',
  sortOrder?: 'ASC' | 'DESC',
  first?: number,
  after?: string,
): Promise<{ trips: Trip[]; hasNextPage: boolean; endCursor: string | null; totalCount: number }> => {

  const toDateOnly = (value: string) => value.split('T')[0];

  const filterTrips = (items: Trip[]) => {
    return items.filter(trip => {
      const matchDeparture = !departure || trip.departure.toLowerCase().includes(departure.toLowerCase());
      const matchDestination = !destination || trip.destination.toLowerCase().includes(destination.toLowerCase());
      let matchDate = true;
      if (date) {
        if (rangeDays !== undefined) {
          const center = new Date(date);
          const from = new Date(center); from.setDate(from.getDate() - rangeDays); from.setHours(0,0,0,0);
          const to = new Date(center); to.setDate(to.getDate() + rangeDays); to.setHours(23,59,59,999);
          const tripDate = new Date(trip.date);
          matchDate = tripDate >= from && tripDate <= to;
        } else {
          matchDate = toDateOnly(trip.date) === toDateOnly(date);
        }
      }
      const matchPrice = !maxPrice || trip.price <= maxPrice;
      const matchSeats = !minSeats || (trip.seats - trip.seatsBooked) >= minSeats;
      return matchDeparture && matchDestination && matchDate && matchPrice && matchSeats && trip.status === 'active';
    });
  };

  const sortTrips = (items: Trip[]) => {
    if (!sortBy) return items;
    const direction = (sortOrder ?? 'ASC') === 'ASC' ? 1 : -1;
    return [...items].sort((a, b) => {
      if (sortBy === 'price') return (a.price - b.price) * direction;
      if (sortBy === 'driverRating') {
        const aR = a.driver?.rating ?? (sortOrder === 'ASC' ? Infinity : -Infinity);
        const bR = b.driver?.rating ?? (sortOrder === 'ASC' ? Infinity : -Infinity);
        return (aR - bR) * direction;
      }
      return (new Date(a.date).getTime() - new Date(b.date).getTime()) * direction;
    });
  };

  const applyCursorPagination = (items: Trip[]) => {
    const pageSize = first ?? 5;
    const afterIndex = after ? parseInt(after, 10) : NaN;
    const startIndex = isNaN(afterIndex) ? 0 : afterIndex + 1;
    const page = items.slice(startIndex, startIndex + pageSize);
    const endIndex = page.length > 0 ? startIndex + page.length - 1 : null;
    return {
      trips: page,
      hasNextPage: startIndex + pageSize < items.length,
      endCursor: endIndex === null ? null : String(endIndex),
      totalCount: items.length,
    };
  };

  try {
    if (date && rangeDays !== undefined) {
      const response = await tripsService.searchTripsNearDate(date, rangeDays);
      const filtered = filterTrips(response);
      const sorted = sortTrips(filtered);
      return applyCursorPagination(sorted);
    }

    const response = await tripsService.searchTrips({
      departure: departure || undefined,
      destination: destination || undefined,
      date: date || undefined,
      maxPrice: maxPrice || undefined,
      minSeats: minSeats || undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
      first: first || undefined,
      after: after || undefined,
    });

    if (response && Array.isArray(response.edges)) {
      return {
        trips: response.edges.map(e => e.node),
        hasNextPage: response.pageInfo?.hasNextPage ?? false,
        endCursor: response.pageInfo?.endCursor ?? null,
        totalCount: response.edges.length,
      };
    }

    return { trips: [], hasNextPage: false, endCursor: null, totalCount: 0 };
  } catch (error) {
    console.error('Search trips failed:', error);
    const filtered = filterTrips(trips);
    const sorted = sortTrips(filtered);
    return applyCursorPagination(sorted);
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

  const completeTrip = useCallback(async (tripId: number) => {
    try {
      await tripsService.completeTrip(tripId);
      setDriverTripsState(prev => prev.map(t => (t.id === tripId ? { ...t, status: 'completed' } : t)));
      addNotification({
        type: 'success',
        message: 'Trajet marqué comme terminé',
      });
    } catch (error: any) {
      console.error('Complete trip failed:', error);
      addNotification({
        type: 'error',
        message: 'Erreur lors de la finalisation du trajet',
        details: error.response?.data?.message || 'Impossible de marquer le trajet comme terminé',
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
      
      // Extract detailed error message from backend
      let errorMessage = 'Impossible de mettre à jour le profil';
      let errorDetails = '';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Try different error message locations
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.errors) {
          // Handle validation errors (array of errors)
          if (Array.isArray(errorData.errors)) {
            errorMessage = errorData.errors.map((e: any) => e.message || String(e)).join(', ');
          } else {
            errorMessage = JSON.stringify(errorData.errors);
          }
        }
        
        // Add status code if available
        if (error.response.status) {
          errorDetails = `(Code: ${error.response.status})`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      addNotification({
        type: 'error',
        message: 'Erreur lors de la mise à jour du profil',
        details: errorMessage + (errorDetails ? ' ' + errorDetails : ''),
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
        authModalMode,
        setAuthModalMode,
        authLoading,
        trips,
        driverTrips: driverTripsState,
        tripsLoading,
        searchTrips,
        createTrip,
        updateTrip,
        cancelTrip,
        completeTrip,
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
