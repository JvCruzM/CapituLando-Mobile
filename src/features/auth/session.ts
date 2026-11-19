import { create } from "zustand";
import { queryClient } from "../../shared/api/query-client";
import { secureStore } from "../../shared/storage/secure-store";
import type { Session } from "./services/auth-api";

interface AuthState {
  session: Session | null;
  isInitialized: boolean;
  setSession: (session: Session) => void;
  clearSession: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isInitialized: false,
  setSession(session: Session) {
    set({ session });
    secureStore.saveAuthSession(session).catch((error) => {
      console.error("Erro ao salvar sessão criptografada no SecureStore:", error);
    });
  },
  clearSession() {
    set({ session: null });
    queryClient.clear();
    secureStore.clearAuthSession().catch((error) => {
      console.error("Erro ao limpar sessão no SecureStore:", error);
    });
  },
  async initialize() {
    try {
      const savedSession = await secureStore.getAuthSession();
      if (savedSession) {
        if (savedSession.expiresAt > Date.now()) {
          set({ session: savedSession, isInitialized: true });
          return;
        } else {
          // Sessão expirada: limpa os dados criptografados armazenados
          await secureStore.clearAuthSession();
        }
      }
    } catch (error) {
      console.error("Erro ao restaurar sessão criptografada do SecureStore:", error);
    } finally {
      set({ isInitialized: true });
    }
  },
}));
