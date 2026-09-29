// services/api.ts — Base HTTP client for AYAM API.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API error ${res.status}: ${errorText || res.statusText}`);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    console.error(`[AYAM API Error] Request to ${endpoint} failed:`, err);
    throw err;
  }
}

export { BASE_URL };
