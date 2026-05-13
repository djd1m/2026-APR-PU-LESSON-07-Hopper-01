import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const API_TIMEOUT_MS = parseInt(process.env.API_TIMEOUT_MS || '10000', 10);
const API_KEY = process.env.INTERNAL_API_KEY || '';

/**
 * Axios client for internal HopperRU API communication.
 * Used by the bot to call search, booking, prediction, freeze, and user endpoints.
 *
 * Endpoints used:
 *   GET  /search/flights         — Search flights by route and date
 *   GET  /search/flights/:id     — Get flight details
 *   GET  /prediction/:flightId   — Get price prediction
 *   POST /bookings               — Create a booking
 *   POST /api/freeze             — Freeze a price
 *   POST /auth/telegram-register — Register a Telegram user
 *   GET  /user/alerts            — Get user price alerts
 *   DELETE /user/alerts/:id      — Delete a price alert
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    ...(API_KEY ? { 'X-Internal-Api-Key': API_KEY } : {}),
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use((config) => {
  console.log(`[api-client] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
});

// Response interceptor for logging and error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const url = error.config?.url || 'unknown';
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
    const status = error.response?.status || 'no response';
    const data = error.response?.data
      ? JSON.stringify(error.response.data).substring(0, 200)
      : '';
    console.error(`[api-client] ${method} ${url} -> ${status} ${data}`);
    return Promise.reject(error);
  }
);
