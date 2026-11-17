import { create } from "zustand";
import { queryClient } from "../../shared/api/query-client";
import type { Session } from "./services/auth-api";

interface AuthState {
  session: Session | null;
  setSession: (session: Session) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  clearSession() {
    set({ session: null });
    queryClient.clear();
  },
}));
