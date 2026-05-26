/**
 * HTTP Client Setup with Axios
 * Provides a configured axios instance with interceptors for auth & error handling
 */

import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { apiConfig } from '@/config/api';

interface CustomAxiosConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

class HttpClient {
  private client: AxiosInstance;
  private isRefreshing: boolean = false;
  private failedQueue: Array<{ onSuccess: (token: string) => void; onFailed: (error: Error) => void }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: apiConfig.baseURL,
      timeout: apiConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor: Add JWT token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: Handle token refresh & errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => this.handleError(error)
    );
  }

  private handleError = async (error: AxiosError) => {
    const config = error.config as CustomAxiosConfig;

    // Handle 401 - Token expired
    if (error.response?.status === 401 && config && !config._retry) {
      config._retry = true;

      if (!this.isRefreshing) {
        this.isRefreshing = true;
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            this.clearAuth();
            return Promise.reject(error);
          }

          const response = await axios.post(`${apiConfig.baseURL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
          localStorage.setItem('accessToken', newAccessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          this.isRefreshing = false;
          this.processQueue(null, newAccessToken);

          // Retry original request
          config.headers.Authorization = `Bearer ${newAccessToken}`;
          return this.client(config);
        } catch (refreshError) {
          this.isRefreshing = false;
          this.processQueue(refreshError, null);
          this.clearAuth();
          return Promise.reject(refreshError);
        }
      }

      // Queue the request if already refreshing
      return new Promise((resolve, reject) => {
        this.failedQueue.push({
          onSuccess: (token: string) => {
            config.headers.Authorization = `Bearer ${token}`;
            resolve(this.client(config));
          },
          onFailed: (err) => reject(err),
        });
      });
    }

    return Promise.reject(error);
  };

  private processQueue = (error: any, token: string | null) => {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.onFailed(error);
      } else if (token) {
        prom.onSuccess(token);
      }
    });
    this.failedQueue = [];
  };

  private clearAuth = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  public getInstance(): AxiosInstance {
    return this.client;
  }

  public setAuthToken(token: string) {
    localStorage.setItem('accessToken', token);
  }

  public setRefreshToken(token: string) {
    localStorage.setItem('refreshToken', token);
  }

  public clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // HTTP method delegators
  public get<T = any>(url: string, config?: any) {
    return this.client.get<T>(url, config);
  }

  public post<T = any>(url: string, data?: any, config?: any) {
    return this.client.post<T>(url, data, config);
  }

  public put<T = any>(url: string, data?: any, config?: any) {
    return this.client.put<T>(url, data, config);
  }

  public patch<T = any>(url: string, data?: any, config?: any) {
    return this.client.patch<T>(url, data, config);
  }

  public delete<T = any>(url: string, config?: any) {
    return this.client.delete<T>(url, config);
  }
}

export const httpClient = new HttpClient();
export default httpClient.getInstance();
