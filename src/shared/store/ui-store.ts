import { create } from "zustand";

type ThemeMode = "system" | "light" | "dark";
interface UIState {
  themeMode: ThemeMode;
  fontSize: "sm" | "md" | "lg";
  setThemeMode: (mode: ThemeMode) => void;
  setFontSize: (fontSize: "sm" | "md" | "lg") => void;
}
export const useUIStore = create<UIState>((set) => ({
  themeMode: "system",
  fontSize: "md",
  setThemeMode: (themeMode) => set({ themeMode }),
  setFontSize: (fontSize) => set({ fontSize }),
}));
