import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthUser {
  id: string;
  userId?: string;
  sub?: string;
  email?: string;
  emailVerified?: boolean;
  username?: string;
  displayName?: string;
  role?: string;
}

interface AuthSnapshot {
  user: AuthUser | null;
  token: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
}

const AUTH_STORAGE_KEY = 'capitulando:auth_session';

let state: AuthSnapshot = {
  user: null,
  token: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  hydrated: false,
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function setState(partial: Partial<AuthSnapshot>) {
  state = { ...state, ...partial };
  emit();
}

export async function hydrateAuthStore(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      setState({ hydrated: true });
      return;
    }
    const parsed = JSON.parse(raw) as {
      user?: AuthUser | null;
      token?: string | null;
      refreshToken?: string | null;
    };
    const token = parsed.token ?? null;
    const user = parsed.user ?? null;
    setState({
      user,
      token,
      accessToken: token,
      refreshToken: parsed.refreshToken ?? null,
      isAuthenticated: Boolean(user?.id || token),
      hydrated: true,
    });
  } catch {
    setState({ hydrated: true });
  }
}

export async function setAuthSession(payload: {
  user: AuthUser;
  token: string;
  refreshToken?: string | null;
}): Promise<void> {
  const { user, token, refreshToken = null } = payload;
  setState({
    user,
    token,
    accessToken: token,
    refreshToken,
    isAuthenticated: Boolean(user?.id || token),
    hydrated: true,
  });
  await AsyncStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ user, token, refreshToken }),
  );
}

export async function clearAuthSession(): Promise<void> {
  setState({
    user: null,
    token: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    hydrated: true,
  });
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
}

// Hidrata automaticamente na primeira importação
void hydrateAuthStore();

export function useAuthStore() {
  const snapshot = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );

  return {
    ...snapshot,
    setSession: setAuthSession,
    clearSession: clearAuthSession,
    hydrate: hydrateAuthStore,
  };
}