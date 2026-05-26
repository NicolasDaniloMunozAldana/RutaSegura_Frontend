const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface RequestOptions extends RequestInit {
  token?: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function apiCall(endpoint: string, options: RequestOptions = {}) {
  const { token, ...restOptions } = options;

  const requestHeaders = new Headers(restOptions.headers);
  if (!requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...restOptions,
    headers: requestHeaders,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}
