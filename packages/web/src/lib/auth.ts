import { apiClient } from './api';

const TOKEN_KEY = 'hopperru_access_token';
const REFRESH_KEY = 'hopperru_refresh_token';
const USER_KEY = 'hopperru_user';

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
}

interface RegisterResponse {
  message: string;
}

interface VerifyResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Send registration / SMS code request.
 */
export async function register(
  phone: string,
  name: string,
): Promise<RegisterResponse> {
  return apiClient<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ phone, name }),
  });
}

/**
 * Verify SMS code and receive JWT tokens.
 */
export async function verify(
  phone: string,
  code: string,
): Promise<VerifyResponse> {
  const response = await apiClient<VerifyResponse>('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });

  // Persist tokens and user data
  saveTokens(response.accessToken, response.refreshToken);
  saveUser(response.user);

  return response;
}

/**
 * Refresh the token pair using the stored refresh token.
 * Returns the new access token, or null if refresh failed.
 */
export async function refreshTokens(): Promise<string | null> {
  const currentRefresh = getRefreshToken();
  if (!currentRefresh) return null;

  try {
    const response = await apiClient<RefreshResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: currentRefresh }),
    });

    saveTokens(response.accessToken, response.refreshToken);
    return response.accessToken;
  } catch {
    // Refresh failed — clear everything and force re-login
    clearAuth();
    return null;
  }
}

/**
 * Get the current access token, refreshing if expired.
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get the stored refresh token.
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

/**
 * Get the stored user data.
 */
export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Check if the user is currently authenticated (has tokens).
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

/**
 * Clear all auth data (logout).
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Logout: clear tokens on client side.
 */
export function logout(): void {
  clearAuth();
  window.location.href = '/auth';
}

/**
 * Build Authorization header for API requests.
 */
export function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// ─── Internal helpers ──────────────────────────────────────

function saveTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

function saveUser(user: AuthUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
