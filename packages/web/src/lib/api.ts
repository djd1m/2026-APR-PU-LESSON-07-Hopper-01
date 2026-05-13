const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://212.192.0.33:9100/api';

/**
 * Typed fetch wrapper for internal API calls.
 * Automatically prepends the base URL and parses JSON responses.
 */
export async function apiClient<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
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
