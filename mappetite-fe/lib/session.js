"use client";

import { createLocalStore } from "./local-store";

// Session = { token, user }. Stored in localStorage like SmartHub (PRD 12).
// Because of that, never render raw HTML from user input (XSS would expose the token).
const sessionStore = createLocalStore("mappetite.session");

export function tokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function getSession() {
  const session = sessionStore.get();
  if (session?.token && tokenExpired(session.token)) {
    sessionStore.set(null);
    return null;
  }
  return session?.token ? session : null;
}

export function setSession(session) {
  sessionStore.set(session);
}

export function updateSessionUser(user) {
  const session = sessionStore.get();
  if (session?.token) sessionStore.set({ ...session, user });
}

export function clearSession() {
  sessionStore.set(null);
}

export const useSessionValue = sessionStore.useValue;
