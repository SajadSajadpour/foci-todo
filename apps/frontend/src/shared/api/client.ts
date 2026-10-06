export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  csrfToken?: string;
  signal?: AbortSignal;
};

export async function apiRequest<T>(path: `/api/${string}`, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers();
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (options.csrfToken) headers.set('X-CSRF-Token', options.csrfToken);

  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? 'GET',
      headers,
      credentials: 'include',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('Could not connect. Check your connection and try again.', 0, 'NETWORK_ERROR');
  }

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = payload as { error?: { code?: string; message?: string } } | null;
    throw new ApiError(
      parsed?.error?.message ?? 'Something went wrong. Please try again.',
      response.status,
      parsed?.error?.code ?? 'UNKNOWN_ERROR',
    );
  }
  return payload as T;
}
