const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'site-ticket-token';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function handleUnauthorized() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('site-ticket-token');
  localStorage.removeItem('site-ticket-user');
  window.location.href = '/login';
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new ApiError('Session expirée, merci de vous reconnecter.', 401);
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message?: string }).message ?? 'Une erreur est survenue.')
        : 'Une erreur est survenue.';
    throw new ApiError(message, response.status);
  }

  return payload as T;
}
