import type { User } from 'firebase/auth';

/**
 * Wrapper around fetch() that attaches a fresh Firebase ID token as a
 * `Authorization: Bearer <token>` header for authenticated API calls.
 *
 * A fresh token is requested via `user.getIdToken()` on every call so we never
 * send an expired token (Firebase ID tokens expire ~hourly). If there is no
 * signed-in user, or the token cannot be fetched, the request is still sent
 * without the header and the server will respond 401 — callers handle that via
 * their existing error/fallback paths.
 */
export async function authedFetch(
  url: string,
  user: User | null,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers || {});

  if (user) {
    try {
      const token = await user.getIdToken();
      headers.set('Authorization', `Bearer ${token}`);
    } catch (err) {
      console.error('authedFetch: failed to obtain Firebase ID token', err);
    }
  }

  return fetch(url, { ...init, headers });
}
