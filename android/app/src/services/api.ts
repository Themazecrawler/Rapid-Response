
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError } from 'axios';
import { API_CONFIG } from '../config/api';
import { retry } from '../utils/retry';


const BASE_URL = 'YOUR_BACKEND_API_URL';
// Enhanced API client with retry logic
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
});
// Retry configuration
const retryConfig = {
  maxRetries: 3,
  delayMs: 1000,
  backoffFactor: 2,
};
// Request interceptor with authentication
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  } catch (error) {
    return Promise.reject(error);
  }
});

// Response interceptor with error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle token refresh or logout
      await AsyncStorage.removeItem('userToken');
      // Navigate to login
      // You'll need to implement navigation reference
    }
    return Promise.reject(error);
  }
);

// Enhanced API methods with retry logic
export const enhancedApi = {
  get: (url: string, config = {}) =>
    retry(() => api.get(url, config), retryConfig),

  post: (url: string, data = {}, config = {}) =>
    retry(() => api.post(url, data, config), retryConfig),

  put: (url: string, data = {}, config = {}) =>
    retry(() => api.put(url, data, config), retryConfig),

  delete: (url: string, config = {}) =>
    retry(() => api.delete(url, config), retryConfig),
};

// Types
export interface User {
  id: number;
  authId: string;
  email: string;
  displayName: string;
  role: 'student' | 'security' | 'admin';
  campus: string;
  createdAt: string;
  lastLogin: string;
}

export interface EmergencyAlert {
  id: number;
  userId: number;
  type: string;
  description: string;
  latitude?: number;
  longitude?: number;
  building?: string;
  floor?: string;
  status: 'active' | 'resolved' | 'investigating';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: number;
}

export interface EmergencyContact {
  id: number;
  name: string;
  role: string;
  phone: string;
  email: string;
  department: string;
  available: boolean;
}

// API client setup
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Add token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// User API
export const userApi = {
  createProfile: async (userData: Partial<User>) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  updateProfile: async (userId: number, data: Partial<User>) => {
    const response = await api.put(`/users/${userId}`, data);
    return response.data;
  },

  getProfile: async (userId: number) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },
};

// Alert API
export const alertApi = {
  createAlert: async (alertData: Partial<EmergencyAlert>) => {
    const response = await api.post('/alerts', alertData);
    return response.data;
  },

  updateAlert: async (alertId: number, data: Partial<EmergencyAlert>) => {
    const response = await api.put(`/alerts/${alertId}`, data);
    return response.data;
  },

  getRecentAlerts: async (hours: number = 24) => {
    const response = await api.get('/alerts/recent', { params: { hours } });
    return response.data;
  },

  getUserAlerts: async (userId: number) => {
    const response = await api.get(`/alerts/user/${userId}`);
    return response.data;
  },

  getAlertStatistics: async (userId: number) => {
    const response = await api.get(`/alerts/statistics/${userId}`);
    return response.data;
  },
};

// Emergency Contacts API
export const contactsApi = {
  getContacts: async () => {
    const response = await api.get('/contacts');
    return response.data;
  },

  createContact: async (contactData: Partial<EmergencyContact>) => {
    const response = await api.post('/contacts', contactData);
    return response.data;
  },

  updateContact: async (contactId: number, data: Partial<EmergencyContact>) => {
    const response = await api.put(`/contacts/${contactId}`, data);
    return response.data;
  },
};

// File Upload API
export const uploadApi = {
  uploadAttachment: async (alertId: number, file: any) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/alerts/${alertId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};