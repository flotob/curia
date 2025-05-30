// src/utils/authFetch.ts

interface AuthFetchOptions extends RequestInit {
  token?: string | null;
}

/**
 * A wrapper around the native fetch API that automatically includes 
 * an Authorization header if a token is provided.
 *
 * @param url The URL to fetch.
 * @param options Fetch options, including an optional `token`.
 * @returns Promise<Response> The raw fetch Response object.
 */
export async function authFetch(url: string, options: AuthFetchOptions = {}): Promise<Response> {
  const { token, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers || {});

  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }

  // Ensure Content-Type is set for POST/PUT/PATCH if body is an object (and not FormData)
  if (fetchOptions.body && typeof fetchOptions.body === 'object' && !(fetchOptions.body instanceof FormData)) {
    if (!headers.has('Content-Type')) {
      headers.append('Content-Type', 'application/json');
    }
    // Stringify the body if it's an object and Content-Type is application/json
    if (headers.get('Content-Type')?.includes('application/json')) {
        fetchOptions.body = JSON.stringify(fetchOptions.body);
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  return response;
}

/**
 * A helper function that uses authFetch and processes the response,
 * expecting a JSON body. Throws an error if the response is not ok.
 *
 * @param url The URL to fetch.
 * @param options Fetch options, including an optional `token`.
 * @returns Promise<T> The parsed JSON response body.
 */
export async function authFetchJson<T = unknown>(url: string, options: AuthFetchOptions = {}): Promise<T> {
    const response = await authFetch(url, options);

    if (!response.ok) {
        let errorPayload;
        try {
            errorPayload = await response.json();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) {
            // If parsing error JSON fails, use status text
            throw new Error(response.statusText || `HTTP error! status: ${response.status}`);
        }
        throw new Error(errorPayload?.error || errorPayload?.message || `HTTP error! status: ${response.status}`);
    }

    // Handle cases where response might be empty but still ok (e.g., 204 No Content)
    if (response.status === 204) {
        return null as T; // Or undefined, depending on desired behavior for empty responses
    }

    return response.json() as Promise<T>;
} 