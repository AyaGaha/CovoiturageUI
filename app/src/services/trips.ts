/**
 * Trips API Service
 * Handles trip creation, retrieval, updates, and search
 */

import httpClient from '@/lib/http-client';
import { apiConfig } from '@/config/api';
import type { Trip } from '@/types';

export interface CreateTripRequest {
  departure: string;
  destination: string;
  date: string;
  seats: number;
  price: number;
  description: string;
  carModel: string;
}

export interface UpdateTripRequest {
  price?: number;
  seats?: number;
  description?: string;
}

export interface TripFilters {
  departure?: string;
  destination?: string;
  minSeats?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export interface SearchTripsResponse {
  edges: Array<{
    node: Trip;
    cursor: string;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string;
  };
  totalCount: number;
}

export interface TripStatsResponse {
  totalTrips: number;
  activeTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  totalSeats: number;
}

export const tripsService = {
  /**
   * Create a new trip
   */
  createTrip: async (data: CreateTripRequest): Promise<Trip> => {
    const response = await httpClient.post(apiConfig.endpoints.trips.create, data);
    return response.data;
  },

  /**
   * Get all available trips (paginated)
   */
  getTrips: async (page: number = 1, limit: number = 10): Promise<{ trips: Trip[]; total: number }> => {
    const response = await httpClient.get(apiConfig.endpoints.trips.list, {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Get user's own trips
   */
  getMyTrips: async (): Promise<Trip[]> => {
    const response = await httpClient.get(apiConfig.endpoints.trips.myTrips);
    return response.data;
  },

  /**
   * Get trip by ID
   */
  getTripById: async (id: number): Promise<Trip> => {
    const response = await httpClient.get(apiConfig.endpoints.trips.detail(id));
    return response.data;
  },

  /**
   * Update a trip
   */
  updateTrip: async (id: number, data: UpdateTripRequest): Promise<Trip> => {
    const response = await httpClient.put(apiConfig.endpoints.trips.update(id), data);
    return response.data;
  },

  /**
   * Cancel a trip
   */
  cancelTrip: async (id: number): Promise<Trip> => {
    const response = await httpClient.delete(apiConfig.endpoints.trips.delete(id));
    return response.data;
  },

  /**
   * Search trips with filters
   */
  searchTrips: async (filters: TripFilters): Promise<SearchTripsResponse> => {
    const response = await httpClient.get(apiConfig.endpoints.trips.search, {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get upcoming trips (paginated)
   */
  getUpcomingTrips: async (page: number = 1, limit: number = 10): Promise<{ trips: Trip[]; total: number }> => {
    const response = await httpClient.get(apiConfig.endpoints.trips.list, {
      params: { page, limit, status: 'active' },
    });
    return response.data;
  },

  /**
   * Get trips by status (active, cancelled, completed)
   */
  getTripsByStatus: async (status: 'active' | 'cancelled' | 'completed'): Promise<Trip[]> => {
    const response = await httpClient.get(apiConfig.endpoints.trips.list, {
      params: { status },
    });
    return response.data;
  },

  /**
   * Get trips near a specific date
   */
  getTripsNearDate: async (date: string, rangeDays: number = 3): Promise<Trip[]> => {
    const response = await httpClient.get(apiConfig.endpoints.trips.list, {
      params: { date, rangeDays },
    });
    return response.data;
  },

  /**
   * Get driver trip statistics
   */
  getTripStats: async (): Promise<TripStatsResponse> => {
    const response = await httpClient.get(apiConfig.endpoints.trips.list, {
      params: { stats: true },
    });
    return response.data;
  },
};
