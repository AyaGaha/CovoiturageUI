/**
 * Authentication API Service
 * Handles user registration, login, logout, and token refresh
 */

import httpClient from '@/lib/http-client';
import { apiConfig } from '@/config/api';

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    phone?: string;
    profileImage?: string;
    rating: number;
    isEmailVerified: boolean;
    emergencyContact?: string;
    emergencyPhone?: string;
    createdAt: string;
    updatedAt: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export const authService = {
  /**
   * Register a new user
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await httpClient.post(apiConfig.endpoints.auth.register, data);
    if (response.data.accessToken && response.data.refreshToken) {
      httpClient.setAuthToken(response.data.accessToken);
      httpClient.setRefreshToken(response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /**
   * Login user
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    console.log('🔑 [authService] POST /auth/login with email:', data.email);
    try {
      const response = await httpClient.post(apiConfig.endpoints.auth.login, data);
      console.log('✅ [authService] Login response received:', response.data);
      if (response.data.accessToken && response.data.refreshToken) {
        console.log('🔑 [authService] Setting tokens...');
        httpClient.setAuthToken(response.data.accessToken);
        httpClient.setRefreshToken(response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('❌ [authService] Login failed:', error);
      throw error;
    }
  },

  /**
   * Logout user
   */
  logout: async (): Promise<void> => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await httpClient.post(apiConfig.endpoints.auth.logout, { refreshToken });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    httpClient.clearTokens();
    localStorage.removeItem('user');
  },

  /**
   * Change password
   */
  changePassword: async (data: ChangePasswordRequest): Promise<ChangePasswordResponse> => {
    console.log('🔐 [authService] POST /auth/change-password');
    try {
      const response = await httpClient.post(apiConfig.endpoints.auth.changePassword, data);
      console.log('✅ [authService] Password changed successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [authService] Change password failed:', error);
      throw error;
    }
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await httpClient.post(apiConfig.endpoints.auth.refresh, {
      refreshToken,
    });
    if (response.data.accessToken) {
      httpClient.setAuthToken(response.data.accessToken);
      if (response.data.refreshToken) {
        httpClient.setRefreshToken(response.data.refreshToken);
      }
    }
    return response.data;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('accessToken');
  },

  /**
   * Get stored user data
   */
  getStoredUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * Get current access token
   */
  getAccessToken: (): string | null => {
    return localStorage.getItem('accessToken');
  },

  /**
   * Get current refresh token
   */
  getRefreshToken: (): string | null => {
    return localStorage.getItem('refreshToken');
  },
};

