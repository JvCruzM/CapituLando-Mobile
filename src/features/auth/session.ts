import axios from "axios";
import { create } from "zustand";
import { queryClient } from "../../shared/api/query-client";
import { secureStore } from "../../shared/storage/secure-store";
import {
  isStoredSession,
  renewSession,
  revokeSession,
  type Session,
} from "./services/auth-api";
import { withSessionLock } from "./services/session-lock";

interface AuthState {
  session: Session | null;
  sessionVersion: number;
  isInitialized: boolean;
  isSigningOut: boolean;
  isRefreshing: boolean;
  sessionError: string;
  setSession: (session: Session) => Promise<void>;
  clearSession: () => Promise<void>;
  initialize: () => Promise<void>;
  logout: () => Promise<string>;
}
let initialization: Promise<void> | null = null;
let refreshing: { version: number; promise: Promise<Session> } | null = null;
const changed = () => new Error("A sessão mudou. Abra esta tela novamente.");
const missing = () =>
  new Error("Sua sessão expirou. Entre novamente para continuar.");
const rejected = (error: unknown) =>
  axios.isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0);

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  sessionVersion: 0,
  isInitialized: false,
  isSigningOut: false,
  isRefreshing: false,
  sessionError: "",
  async setSession(session) {
    const version = get().sessionVersion + 1;
    set({ sessionVersion: version });
    try {
      await withSessionLock(async () => {
        if (get().sessionVersion !== version) throw changed();
        await secureStore.saveAuthSession(
          session,
          () => get().sessionVersion === version,
        );
        if (get().sessionVersion !== version) throw changed();
        queryClient.clear();
        set({ session, isInitialized: true, sessionError: "" });
      });
    } catch (error) {
      void revokeSession(session).catch(() => undefined);
      throw error;
    }
  },
  clearSession: () => dropSession(),
  initialize() {
    if (get().isInitialized) return Promise.resolve();
    if (initialization) return initialization;
    const version = get().sessionVersion;
    const task = (async () => {
      try {
        const saved = await withSessionLock(async () => {
          const stored = await secureStore.getAuthSession();
          if (!isStoredSession(stored)) await secureStore.clearAuthSession();
          return stored;
        });
        if (get().sessionVersion !== version) return;
        if (!isStoredSession(saved)) {
          return;
        }
        set({ session: saved });
        if (saved.expiresAt <= Date.now() + 30_000) await refreshAuthSession();
      } catch {
        if (get().sessionVersion === version && get().session)
          set({
            sessionError:
              "Não foi possível renovar a sessão. Confira a conexão e tente novamente.",
          });
      } finally {
        if (get().sessionVersion === version) set({ isInitialized: true });
      }
    })();
    initialization = task;
    void task.finally(() => {
      if (initialization === task) initialization = null;
    });
    return task;
  },
  async logout() {
    if (get().isSigningOut) return "";
    const version = get().sessionVersion;
    const original = get().session;
    if (!original) {
      await dropSession();
      return "";
    }
    set({ isSigningOut: true });
    let notice = "";
    try {
      if (refreshing?.version === version) await refreshing.promise;
      if (get().sessionVersion !== version) return "";
      if (get().session!.expiresAt <= Date.now()) await refreshAuthSession();
      await withSessionLock(async () => {
        if (get().sessionVersion !== version) throw changed();
        const saved = await secureStore.getAuthSession();
        if (!isStoredSession(saved) || saved.sessionId !== original.sessionId)
          return;
        await revokeSession(saved);
      });
    } catch (error) {
      if (!rejected(error))
        notice =
          "Você saiu deste aparelho. Não foi possível confirmar o encerramento no servidor. A sessão do servidor pode continuar ativa.";
    } finally {
      if (get().sessionVersion === version) {
        try {
          await dropSession();
        } catch {
          notice =
            "A sessão foi encerrada, mas não foi possível limpar o armazenamento deste aparelho.";
        }
      }
    }
    return notice;
  },
}));

function dropSession(
  persist = true,
  message = "",
  lockHeld = false,
): Promise<void> {
  const state = useAuthStore.getState();
  useAuthStore.setState({
    session: null,
    sessionVersion: state.sessionVersion + 1,
    isInitialized: true,
    isSigningOut: false,
    isRefreshing: false,
    sessionError: message,
  });
  queryClient.clear();
  const clearing = !persist
    ? Promise.resolve()
    : lockHeld
      ? secureStore.clearAuthSession()
      : withSessionLock(() => secureStore.clearAuthSession());
  void clearing.catch(() =>
    useAuthStore.setState({
      sessionError:
        "Não foi possível limpar a sessão armazenada neste aparelho.",
    }),
  );
  return clearing;
}

function applyStored(session: Session | null) {
  const current = useAuthStore.getState();
  const same = current.session?.sessionId === session?.sessionId;
  if (!same) queryClient.clear();
  useAuthStore.setState({
    session,
    sessionVersion: current.sessionVersion + (same ? 0 : 1),
    isInitialized: true,
    sessionError: "",
    isSigningOut: same && current.isSigningOut,
  });
}

export async function synchronizeStoredSession() {
  const version = useAuthStore.getState().sessionVersion;
  const saved = await secureStore.getAuthSession();
  if (useAuthStore.getState().sessionVersion !== version) return;
  if (!isStoredSession(saved)) {
    if (useAuthStore.getState().session) await dropSession(false);
  } else applyStored(saved);
}

export function refreshAuthSession(rejectedToken?: string): Promise<Session> {
  const state = useAuthStore.getState();
  const original = state.session;
  const version = state.sessionVersion;
  if (!original) return Promise.reject(missing());
  if (rejectedToken && original.accessToken !== rejectedToken)
    return Promise.resolve(original);
  if (refreshing?.version === version) return refreshing.promise;
  useAuthStore.setState({ isRefreshing: true });
  const promise = withSessionLock(async () => {
    if (useAuthStore.getState().sessionVersion !== version) throw changed();
    const saved = await secureStore.getAuthSession();
    if (!isStoredSession(saved) || saved.sessionId !== original.sessionId) {
      if (isStoredSession(saved)) applyStored(saved);
      else await dropSession(false);
      throw changed();
    }
    if (saved.refreshToken !== original.refreshToken) {
      applyStored(saved);
      return saved;
    }
    try {
      const next = await renewSession(saved);
      if (next.sessionId !== saved.sessionId || next.user.id !== saved.user.id)
        throw missing();
      if (useAuthStore.getState().sessionVersion !== version) {
        void revokeSession(next).catch(() => undefined);
        throw changed();
      }
      const stillSaved = await secureStore.getAuthSession();
      if (
        !isStoredSession(stillSaved) ||
        stillSaved.sessionId !== saved.sessionId
      ) {
        void revokeSession(next).catch(() => undefined);
        if (isStoredSession(stillSaved)) applyStored(stillSaved);
        else await dropSession(false);
        throw changed();
      }
      await secureStore.saveAuthSession(
        next,
        () => useAuthStore.getState().sessionVersion === version,
      );
      if (useAuthStore.getState().sessionVersion !== version) throw changed();
      useAuthStore.setState({ session: next, sessionError: "" });
      return next;
    } catch (error) {
      if (useAuthStore.getState().sessionVersion === version) {
        if (rejected(error))
          await dropSession(
            true,
            "Sua sessão foi encerrada. Entre novamente.",
            true,
          );
        else
          useAuthStore.setState({
            sessionError:
              "Não foi possível renovar a sessão. Confira a conexão e tente novamente.",
          });
      }
      throw error;
    }
  }, true).catch((error) => {
    const current = useAuthStore.getState();
    if (
      current.sessionVersion === version &&
      current.session &&
      !current.sessionError
    )
      useAuthStore.setState({
        sessionError:
          error instanceof Error && !axios.isAxiosError(error)
            ? error.message
            : "Não foi possível renovar a sessão. Confira a conexão e tente novamente.",
      });
    throw error;
  });
  refreshing = { version, promise };
  const finished = () => {
    if (refreshing?.promise === promise) refreshing = null;
    if (useAuthStore.getState().sessionVersion === version)
      useAuthStore.setState({ isRefreshing: false });
  };
  void promise.then(finished, finished);
  return promise;
}

export async function ensureAuthSession(): Promise<Session> {
  const state = useAuthStore.getState();
  if (!state.isInitialized && !state.session) await state.initialize();
  const current = useAuthStore.getState();
  if (!current.session) throw missing();
  if (current.isSigningOut)
    throw new Error("Aguarde o encerramento da sessão.");
  return current.session.expiresAt <= Date.now() + 30_000
    ? refreshAuthSession()
    : current.session;
}
