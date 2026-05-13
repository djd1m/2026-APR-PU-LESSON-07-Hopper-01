const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://212.192.0.33:7101/api';

/**
 * Get access token from localStorage (browser only).
 */
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('hopperru_access_token');
}

/**
 * Typed fetch wrapper for internal API calls.
 * Automatically prepends the base URL, attaches JWT, and parses JSON.
 */
export async function apiClient<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new ApiError(response.status, body || response.statusText, url);
  }

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
    public url: string
  ) {
    super(`API ${status}: ${body} (${url})`);
    this.name = 'ApiError';
  }
}
