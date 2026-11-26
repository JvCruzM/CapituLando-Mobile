import { create } from "zustand";

type ThemeMode = "system" | "light" | "dark";
interface UIState {
  logoutNotice: string;
  setLogoutNotice: (message: string) => void;
  themeMode: ThemeMode;
  fontSize: "sm" | "md" | "lg";
  setThemeMode: (mode: ThemeMode) => void;
  setFontSize: (fontSize: "sm" | "md" | "lg") => void;
}
export const useUIStore = create<UIState>((set) => ({
  logoutNotice: "",
  setLogoutNotice: (logoutNotice) => set({ logoutNotice }),
  themeMode: "system",
  fontSize: "md",
  setThemeMode: (themeMode) => set({ themeMode }),
  setFontSize: (fontSize) => set({ fontSize }),
}));
