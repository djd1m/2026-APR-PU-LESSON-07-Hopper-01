import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
const API_TIMEOUT_MS = parseInt(process.env.API_TIMEOUT_MS || '10000', 10);
const API_KEY = process.env.INTERNAL_API_KEY || '';

/**
 * Axios client for internal HopperRU API communication.
 * Used by the bot to call search, booking, prediction, and freeze endpoints.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    ...(API_KEY ? { 'X-Internal-Api-Key': API_KEY } : {}),
  },
});

// Response interceptor for logging
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const url = error.config?.url || 'unknown';
    const status = error.response?.status || 'no response';
    console.error(`[api-client] ${error.config?.method?.toUpperCase()} ${url} -> ${status}`);
    return Promise.reject(error);
  }
);
