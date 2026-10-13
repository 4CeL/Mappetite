"use client";

import { API_URL } from "./config";
import { clearSession, getSession } from "./session";

export class ApiError extends Error {
  constructor(status, key, message, data = null) {
    super(message || key);
    this.name = "ApiError";
    this.status = status;
    this.key = key;
    this.data = data;
  }
}

/**
 * Call the Flask API. Resolves with the envelope's `data`, rejects with ApiError.
 * A 401 on an authenticated call clears the session (the auth gate then redirects).
 */
export async function apiRequest(path, { method = "GET", body, auth = true, signal } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const session = auth ? getSession() : null;
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new ApiError(0, "common.network_error", "Network error");
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.error?.status) {
    const status = response.status;
    const key = payload?.error?.key || (status >= 500 ? "common.server_error" : "common.bad_request");
    if (status === 401 && auth) clearSession();
    throw new ApiError(status, key, payload?.error?.message, payload?.data ?? null);
  }

  return payload?.data ?? null;
}

export const api = {
  register: (body) => apiRequest("/api/auth/register", { method: "POST", body, auth: false }),
  login: (body) => apiRequest("/api/auth/login", { method: "POST", body, auth: false }),
  loginWithGoogle: (body) => apiRequest("/api/auth/google", { method: "POST", body, auth: false }),
  me: () => apiRequest("/api/auth/me"),
  updateMe: (body) => apiRequest("/api/auth/me", { method: "PATCH", body }),

  parseLink: (url, language) => apiRequest("/api/places/parse-link", { method: "POST", body: { url, language } }),
  listPlaces: (signal) => apiRequest("/api/places?page_size=500&sort=newest", { signal }),
  getPlace: (id, signal) => apiRequest(`/api/places/${encodeURIComponent(id)}`, { signal }),
  createPlace: (body) => apiRequest("/api/places", { method: "POST", body }),
  updatePlace: (id, body) => apiRequest(`/api/places/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  deletePlace: (id) => apiRequest(`/api/places/${encodeURIComponent(id)}`, { method: "DELETE" }),

  listTags: (signal) => apiRequest("/api/tags", { signal }),
  createTag: (name) => apiRequest("/api/tags", { method: "POST", body: { name } }),
  renameTag: (id, name) => apiRequest(`/api/tags/${encodeURIComponent(id)}`, { method: "PATCH", body: { name } }),
  deleteTag: (id) => apiRequest(`/api/tags/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
