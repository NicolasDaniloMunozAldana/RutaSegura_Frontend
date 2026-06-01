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
    // El backend devuelve { message, errors?[] }. Adjuntamos el detalle de
    // errors para que el usuario vea exactamente qué campo falló.
    const detail =
      Array.isArray(error?.errors) && error.errors.length
        ? `: ${error.errors.join(" · ")}`
        : "";
    throw new Error(
      `${error.message || `API error: ${response.status}`}${detail}`,
    );
  }

  return response.json();
}
