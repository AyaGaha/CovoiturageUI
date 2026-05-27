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
import { apiConfig } from '@/config/api';

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
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>;
  profileLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const TRIPS_CACHE_KEY = 'publicTripsCache';

const readCachedTrips = (): Trip[] => {
  try {
    const raw = localStorage.getItem(TRIPS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((t) => normalizeTrip(t as Trip)) : [];
  } catch {
    return [];
  }
};

const persistTripsCache = (items: Trip[]) => {
  try {
    localStorage.setItem(TRIPS_CACHE_KEY, JSON.stringify(items));
  } catch {
    // Ignore localStorage write failures
  }
};

const normalizeTripStatus = (status?: string): 'active' | 'cancelled' | 'completed' => {
  const value = (status ?? 'active').toLowerCase();
  if (value === 'cancelled') return 'cancelled';
  if (value === 'completed') return 'completed';
  return 'active';
};

const normalizeTrip = (trip: Trip): Trip => {
  return {
    ...trip,
    status: normalizeTripStatus(String(trip.status)),
  };
};

const extractBookingFromSseMessage = (raw: unknown): BookingRequest | null => {
  const obj = raw as any;
  const booking = obj?.booking ?? obj?.data?.booking ?? obj?.payload?.booking ?? obj?.data ?? obj?.payload ?? obj;
  if (!booking || booking.id === undefined || booking.tripId === undefined) {
    return null;
  }

  return {
    ...booking,
    id: Number(booking.id),
    tripId: Number(booking.tripId),
  } as BookingRequest;
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const ACCESS_TOKEN_REFRESH_INTERVAL_MS = 14 * 60 * 1000;
  const PUBLIC_TRIPS_TIMEOUT_MS = 12000;
  const SEARCH_TRIPS_TIMEOUT_MS = 12000;

  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, context: string): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error(`${context} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((value) => {
          window.clearTimeout(timeoutId);
          resolve(value);
        })
        .catch((error) => {
          window.clearTimeout(timeoutId);
          reject(error);
        });
    });
  };

  // Auth
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [authModal, setAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState(false);

  // Trips
  const [trips, setTrips] = useState<Trip[]>(() => readCachedTrips());
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

  // Keep session alive by refreshing access token before expiration
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const refreshSession = async () => {
      const refreshToken = authService.getRefreshToken();
      if (!refreshToken || refreshToken === 'undefined' || refreshToken === 'null') {
        return;
      }

      try {
        await authService.refreshToken(refreshToken);
      } catch (error) {
        console.error('Silent token refresh failed:', error);
      }
    };

    const intervalId = window.setInterval(() => {
      void refreshSession();
    }, ACCESS_TOKEN_REFRESH_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshSession();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    void refreshSession();

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [ACCESS_TOKEN_REFRESH_INTERVAL_MS, isAuthenticated]);

  // Profile
  const [profileLoading, setProfileLoading] = useState(false);

  const [userState, setUserState] = useState<User | null>(authService.getStoredUser() || null);

  const notificationIdRef = useRef(4);
  const notifiedBookingRequestIdsRef = useRef<Set<number>>(new Set());

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

  const notifyNewBookingRequest = useCallback((booking: BookingRequest) => {
    if (notifiedBookingRequestIdsRef.current.has(booking.id)) {
      return;
    }

    notifiedBookingRequestIdsRef.current.add(booking.id);
    const passengerName = booking.passenger?.name?.trim() || 'Un passager';
    addNotification({
      type: 'info',
      message: 'Nouvelle demande de reservation',
      details: `${passengerName} vient de demander une place sur l un de vos trajets.`,
      action: {
        route: '/trips',
        tripId: booking.tripId,
        bookingId: booking.id,
      },
    });
  }, [addNotification]);

  // Load all trips on app mount (for search page)
useEffect(() => {
    const loadPublicTrips = async () => {
      try {
        setTripsLoading(true);
        // Use GraphQL query for upcoming trips
        const trips = await withTimeout(
          tripsService.getUpcomingTripsGraphQL(1, 50),
          PUBLIC_TRIPS_TIMEOUT_MS,
          'Load public trips',
        );
        const resolvedTrips = (trips.length > 0 ? trips : mockTrips).map(normalizeTrip);
        setTrips(resolvedTrips);
        persistTripsCache(resolvedTrips);
      } catch (error) {
        console.error('Failed to load trips:', error);
        // Fallback to mockData if API fails
        const fallbackTrips = mockTrips.map(normalizeTrip);
        setTrips(fallbackTrips);
        persistTripsCache(fallbackTrips);
      } finally {
        setTripsLoading(false);
      }
    };

    loadPublicTrips();
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
          setDriverTripsState(myTrips.map(normalizeTrip));

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
      const normalizedPublicTrips = allTrips.map(normalizeTrip);
      setTrips(normalizedPublicTrips);
      persistTripsCache(normalizedPublicTrips);

      if (isAuthenticated) {
        const myTrips = await tripsService.getMyTrips();
        setDriverTripsState(myTrips.map(normalizeTrip));
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

  const loadInitialBookingRequests = async (notifyOnNew: boolean = false) => {
    if (!isAuthenticated || driverTripsState.length === 0) {
      setBookingRequests([]);
      return;
    }

    try {
      const allRequests: BookingRequest[] = [];
      for (const trip of driverTripsState) {
        try {
          const pending = await bookingsService.getPendingBookings(trip.id);
          allRequests.push(...pending);
        } catch (error) {
          console.warn(`Failed to load pending bookings for trip ${trip.id}:`, error);
        }
      }

      const byId = new Map<number, BookingRequest>();
      for (const req of allRequests) {
        byId.set(req.id, req);
      }
      const nextRequests = Array.from(byId.values());
      setBookingRequests(prev => {
        if (notifyOnNew) {
          const prevIds = new Set(prev.map(item => item.id));
          const newItems = nextRequests.filter(item => !prevIds.has(item.id));
          for (const item of newItems) {
            notifyNewBookingRequest(item);
          }
        }
        return nextRequests;
      });
    } catch (error) {
      console.error('Failed to load initial booking requests:', error);
    }
  };

  // Initial seed of pending booking requests for the current driver's trips.
  useEffect(() => {
    void loadInitialBookingRequests();
  }, [isAuthenticated, driverTripsState]);

  // Real-time booking requests via SSE
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const accessToken = authService.getAccessToken();
    const streamUrl = accessToken
      ? `${apiConfig.baseURL}/bookings/stream?token=${encodeURIComponent(accessToken)}`
      : `${apiConfig.baseURL}/bookings/stream`;

    const eventSource = new EventSource(streamUrl, { withCredentials: true });
    let fallbackPollingId: number | null = null;

    const startFallbackPolling = () => {
      if (fallbackPollingId !== null) {
        return;
      }
      fallbackPollingId = window.setInterval(() => {
        void loadInitialBookingRequests(true);
      }, 5000);
    };

    const stopFallbackPolling = () => {
      if (fallbackPollingId !== null) {
        window.clearInterval(fallbackPollingId);
        fallbackPollingId = null;
      }
    };

    eventSource.onopen = () => {
      stopFallbackPolling();
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const booking = extractBookingFromSseMessage(parsed);
        if (!booking) {
          return;
        }

        const status = String(booking.status ?? 'pending').toLowerCase();
        if (status !== 'pending') {
          return;
        }

        if (driverTripsState.length === 0) {
          return;
        }

        const isForThisDriver = driverTripsState.some(trip => trip.id === booking.tripId);
        if (!isForThisDriver) {
          return;
        }

        let isNewRequest = false;
        setBookingRequests(prev => {
          const exists = prev.some(item => item.id === booking.id);
          if (exists) {
            return prev;
          }
          isNewRequest = true;
          return [booking, ...prev];
        });

        if (isNewRequest) {
          notifyNewBookingRequest(booking);
        }
      } catch (error) {
        console.error('Failed to parse SSE booking event:', error);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error', err);
      startFallbackPolling();
    };

    return () => {
      stopFallbackPolling();
      eventSource.close();
    };
  }, [isAuthenticated, driverTripsState, notifyNewBookingRequest]);


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
      notifiedBookingRequestIdsRef.current.clear();
      
      // Charger les trajets publics depuis l'API
      try {
        const { trips: allTrips } = await tripsService.getTrips();
        const normalizedPublicTrips = allTrips.map(normalizeTrip);
        setTrips(normalizedPublicTrips);
        persistTripsCache(normalizedPublicTrips);
      } catch (error) {
        console.error('Failed to reload public trips:', error);
        setTrips([]);
        persistTripsCache([]);
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
      return (
        matchDeparture &&
        matchDestination &&
        matchDate &&
        matchPrice &&
        matchSeats &&
        normalizeTripStatus(String(trip.status)) === 'active'
      );
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
    const pageSize = first ?? 6;
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

  const isInitialBrowse =
    !departure &&
    !destination &&
    !date &&
    rangeDays === undefined &&
    !maxPrice &&
    !minSeats;

  if (isInitialBrowse && trips.length > 0) {
    const filtered = filterTrips(trips);
    const sorted = sortTrips(filtered);
    return applyCursorPagination(sorted);
  }

  try {
    if (date && rangeDays !== undefined) {
      const response = await withTimeout(
        tripsService.searchTripsNearDate(date, rangeDays),
        SEARCH_TRIPS_TIMEOUT_MS,
        'Search trips near date',
      );
      const filtered = filterTrips(response.map(normalizeTrip));
      const sorted = sortTrips(filtered);
      return applyCursorPagination(sorted);
    }

    const response = await withTimeout(
      tripsService.searchTrips({
        departure: departure || undefined,
        destination: destination || undefined,
        date: date || undefined,
        maxPrice: maxPrice || undefined,
        minSeats: minSeats || undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
        first: first || undefined,
        after: after || undefined,
      }),
      SEARCH_TRIPS_TIMEOUT_MS,
      'Search trips',
    );

    if (response && Array.isArray(response.edges)) {
      return {
        trips: response.edges.map(e => normalizeTrip(e.node)),
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
      const createdTrip = normalizeTrip(await tripsService.createTrip(data));
      setDriverTripsState(prev => [createdTrip, ...prev]);
      if (createdTrip.status === 'active') {
        setTrips(prev => {
          const exists = prev.some(t => t.id === createdTrip.id);
          const next = exists
            ? prev.map(t => (t.id === createdTrip.id ? createdTrip : t))
            : [createdTrip, ...prev];
          persistTripsCache(next);
          return next;
        });
      }
      addNotification({
        type: 'success',
        message: 'Trajet créé',
        details: `${data.departure} → ${data.destination}`,
      });
      return createdTrip;
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
      const updatedTrip = normalizeTrip(await tripsService.updateTrip(tripId, data));
      setDriverTripsState(prev => prev.map(t => (t.id === tripId ? updatedTrip : t)));
      setTrips(prev => {
        const next = prev.map(t => (t.id === tripId ? updatedTrip : t));
        persistTripsCache(next);
        return next;
      });
      addNotification({
        type: 'success',
        message: 'Trajet modifié',
      });
      return updatedTrip;
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
      setTrips(prev => {
        const next = prev.map(t => (t.id === tripId ? { ...t, status: 'cancelled' as const } : t));
        persistTripsCache(next);
        return next;
      });
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
      // Save updated user to localStorage so it persists after page reload
      localStorage.setItem('user', JSON.stringify(updated));
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

  const changePassword = useCallback(async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    try {
      setProfileLoading(true);
      await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      addNotification({
        type: 'success',
        message: 'Mot de passe modifié',
        details: 'Votre mot de passe a été changé avec succès',
      });
    } catch (error: any) {
      console.error('Change password failed:', error);
      
      // Extract detailed error message from backend
      let errorMessage = 'Impossible de modifier le mot de passe';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Try different error message locations
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.errors) {
          if (Array.isArray(errorData.errors)) {
            errorMessage = errorData.errors.map((e: any) => e.message || String(e)).join(', ');
          } else {
            errorMessage = JSON.stringify(errorData.errors);
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      addNotification({
        type: 'error',
        message: 'Erreur de modification du mot de passe',
        details: errorMessage,
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
        changePassword,
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

