/**
 * Users API Service
 * Handles user profile retrieval and updates
 */

import httpClient from '@/lib/http-client';
import { apiConfig } from '@/config/api';
import type { User } from '@/types';

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  profileImage?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

export interface UserProfile extends User {
  role?: string;
  isEmailVerified?: boolean;
  updatedAt?: string;
}

const toMessageString = (value: unknown): string | null => {
  if (!value) return null;
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => (typeof item === 'string' ? item : item && typeof item === 'object' ? JSON.stringify(item) : String(item)))
      .filter(Boolean)
      .join(', ');
    return joined || null;
  }
  if (typeof value === 'string') return value;
  return null;
};

const extractGraphQLErrorMessage = (payload: any, fallback: string): string => {
  const errors = payload?.errors;
  if (!Array.isArray(errors) || errors.length === 0) {
    return fallback;
  }

  const first = errors[0];
  const genericMessage = toMessageString(first?.message);
  const detailedMessage =
    toMessageString(first?.extensions?.originalError?.message) ??
    toMessageString(first?.extensions?.exception?.response?.message) ??
    toMessageString(first?.extensions?.response?.message);

  // Prefer detailed validation messages over generic wrappers like "Bad Request Exception".
  if (detailedMessage) {
    return detailedMessage;
  }

  return genericMessage || fallback;
};

export const usersService = {
  /**
   * Get current authenticated user profile
   */
  getMe: async (): Promise<UserProfile> => {
    const query = `
      query {
        me {
          id
          name
          email
          role
          phone
          profileImage
          rating
          isEmailVerified
          emergencyContact
          emergencyPhone
          createdAt
          updatedAt
        }
      }
    `;
    const response = await httpClient.post(apiConfig.endpoints.graphql, { query });
    if (!response.data?.data?.me) {
      throw new Error(extractGraphQLErrorMessage(response.data, 'Impossible de charger le profil utilisateur.'));
    }
    return response.data.data.me;
  },

  /**
   * Get public profile of a user
   */
  getUserProfile: async (userId: number): Promise<UserProfile> => {
    const query = `
      query {
        userProfile(id: ${userId}) {
          id
          name
          role
          phone
          profileImage
          rating
          isEmailVerified
          createdAt
        }
      }
    `;
    const response = await httpClient.post(apiConfig.endpoints.graphql, { query });
    if (!response.data?.data?.userProfile) {
      throw new Error(extractGraphQLErrorMessage(response.data, 'Impossible de charger ce profil utilisateur.'));
    }
    return response.data.data.userProfile;
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: UpdateProfileRequest): Promise<UserProfile> => {
    const query = `
      mutation {
        updateProfile(input: {
          name: ${data.name ? `"${data.name}"` : 'null'}
          phone: ${data.phone ? `"${data.phone}"` : 'null'}
          profileImage: ${data.profileImage ? `"${data.profileImage}"` : 'null'}
          emergencyContact: ${data.emergencyContact ? `"${data.emergencyContact}"` : 'null'}
          emergencyPhone: ${data.emergencyPhone ? `"${data.emergencyPhone}"` : 'null'}
        }) {
          id
          name
          email
          phone
          profileImage
          emergencyContact
          emergencyPhone
          updatedAt
        }
      }
    `;
    const response = await httpClient.post(apiConfig.endpoints.graphql, { query });
    if (!response.data?.data?.updateProfile) {
      throw new Error(extractGraphQLErrorMessage(response.data, 'Impossible de mettre a jour le profil.'));
    }
    return response.data.data.updateProfile;
  },
};
