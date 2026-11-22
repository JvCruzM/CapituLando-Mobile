import { useEffect } from "react";
import { AppState } from "react-native";
import {
  ensureAuthSession,
  refreshAuthSession,
  synchronizeStoredSession,
  useAuthStore,
} from "../session";
import { observeStoredSession } from "../services/session-lock";

export function useSessionLifecycle() {
  const expiresAt = useAuthStore((state) => state.session?.expiresAt);
  const version = useAuthStore((state) => state.sessionVersion);
  const initialized = useAuthStore((state) => state.isInitialized);
  const signingOut = useAuthStore((state) => state.isSigningOut);
  useEffect(() => {
    void useAuthStore.getState().initialize();
  }, []);
  useEffect(
    () =>
      observeStoredSession(() => {
        void synchronizeStoredSession().catch(() => undefined);
      }),
    [],
  );
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (
        state === "active" &&
        useAuthStore.getState().session &&
        !useAuthStore.getState().isSigningOut
      )
        void ensureAuthSession().catch(() => undefined);
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!initialized || signingOut || expiresAt === undefined) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const renew = async () => {
      if (stopped || useAuthStore.getState().sessionVersion !== version) return;
      try {
        await refreshAuthSession();
      } catch {
        if (
          !stopped &&
          useAuthStore.getState().session &&
          useAuthStore.getState().sessionVersion === version
        )
          timer = setTimeout(renew, 30_000);
      }
    };
    timer = setTimeout(
      renew,
      Math.min(2_147_483_647, Math.max(0, expiresAt - Date.now() - 30_000)),
    );
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [expiresAt, version, initialized, signingOut]);
}
