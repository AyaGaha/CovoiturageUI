/**
 * Bookings API Service
 * Handles booking creation, cancellation, confirmation, and rejection
 */

import httpClient from '@/lib/http-client';
import { apiConfig } from '@/config/api';
import type { Booking, BookingRequest } from '@/types';
import { executeGraphQL } from '@/lib/graphql-client';

export interface CreateBookingRequest {
  tripId: number;
}

export interface BookingResponse {
  id: number;
  passengerId: number;
  tripId: number;
  status: string;
  cancelReason?: string;
  createdAt: string;
}

export const bookingsService = {
  /**
   * Create a new booking (passenger reserves a trip)
   */
  createBooking: async (tripId: number): Promise<BookingResponse> => {
    const response = await httpClient.post(apiConfig.endpoints.bookings.create, { tripId });
    return response.data;
  },

  /**
   * Cancel a booking (passenger cancels their reservation)
   */
  cancelBooking: async (bookingId: number): Promise<BookingResponse> => {
    const response = await httpClient.delete(apiConfig.endpoints.bookings.cancel(bookingId));
    return response.data;
  },

  /**
   * Confirm a booking (driver accepts a pending request)
   */
  confirmBooking: async (bookingId: number): Promise<BookingResponse> => {
    const response = await httpClient.patch(apiConfig.endpoints.bookings.confirm(bookingId));
    return response.data;
  },

  /**
   * Reject a booking (driver refuses a pending request)
   */
  rejectBooking: async (bookingId: number): Promise<BookingResponse> => {
    const response = await httpClient.patch(apiConfig.endpoints.bookings.reject(bookingId));
    return response.data;
  },

  /**
   * Get pending booking requests for a trip (driver only)
   */
  getPendingBookings: async (tripId: number): Promise<BookingRequest[]> => {
    const response = await httpClient.get(apiConfig.endpoints.bookings.pendingByTrip(tripId));
    return response.data;
  },

  /**
   * Get my bookings (passenger) - via GraphQL
   */
  getMyBookings: async (): Promise<Booking[]> => {
  const data = await executeGraphQL<{ myBookings: Booking[] }>({
    query: `
      query {
        myBookings {
          id
          passengerId
          status
          cancelReason
          trip {
            id
            departure
            destination
            date
            price
            seats
            seatsBooked
            status
            description
            carModel
            driver {
                id
                name
                rating
              }
          }
        }
      }
    `,
  });
  console.log('📦 [bookingsService] myBookings response:', data);
  return data?.myBookings ?? [];
},

  /**
   * Get a single booking by ID - via GraphQL
   */
  getBookingById: async (id: number): Promise<Booking> => {
    const data = await executeGraphQL<{ booking: Booking }>({
      query: `
        query GetBooking($id: Int!) {
          booking(id: $id) {
            id
            status
            cancelReason
            trip {
              id
              departure
              destination
              date
              time
              price
              driver {
                id
                name
                rating
              }
            }
          }
        }
      `,
      variables: { id },
    });

    return data.booking;
  },
};