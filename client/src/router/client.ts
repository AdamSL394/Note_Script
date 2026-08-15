import enviromentAPI from '../config/config';

const BASE_URL: string = enviromentAPI.api_url;

interface RequestOptions {
  method?: string;
  body?: unknown;
  extraHeaders?: Record<string, string>;
}

// client.ts is a plain module, not a React component, so it can't call
// the useAuth0() hook directly to get the current access token. Instead,
// it holds a copy of the token in memory, kept fresh by
// useAuthTokenSync() (called once near the app root) via setAuthToken().
// Every request() call attaches whatever token is currently held.
let currentToken: string | null = null;

// request() awaits this before ever firing, so the very first API calls
// on page load (which run in a separate, independent useEffect from the
// token sync) can't race ahead of the token actually being set.
let resolveTokenReady: (() => void) | null = null;
let tokenReadyPromise: Promise<void> = new Promise((resolve) => {
  resolveTokenReady = resolve;
});

export const setAuthToken = (token: string | null): void => {
  currentToken = token;
  if (resolveTokenReady) {
    resolveTokenReady();
    resolveTokenReady = null;
  }
};

/**
 * Shared fetch wrapper. Returns raw response text (or '' on network/parse
 * failure) — callers decide whether/how to JSON.parse it, matching each
 * endpoint's actual behavior (some return JSON, some return plain text).
 */
async function request(
  path: string,
  { method = 'GET', body, extraHeaders }: RequestOptions = {}
): Promise<string> {
  await tokenReadyPromise;

  const headers = new Headers();
  headers.append('X-Requested-With', 'XMLHttpRequest');
  headers.append('origin', BASE_URL);
  if (body !== undefined) {
    headers.append('Content-Type', 'application/json');
  }
  if (currentToken) {
    headers.append('Authorization', `Bearer ${currentToken}`);
  }
  if (extraHeaders) {
    Object.entries(extraHeaders).forEach(([key, value]) =>
      headers.append(key, value)
    );
  }

  const requestOptions: RequestInit = {
    method,
    headers,
    redirect: 'follow',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  try {
    const response = await fetch(`${BASE_URL}${path}`, requestOptions);
    return await response.text();
  } catch (error) {
    console.log('error', error);
    return '';
  }
}

/** Convenience wrapper for endpoints that always return JSON. */
async function requestJson<T>(
  path: string,
  options?: RequestOptions
): Promise<T | null> {
  const text = await request(path, options);
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.log('error parsing response', error);
    return null;
  }
}

export { request, requestJson, BASE_URL };
