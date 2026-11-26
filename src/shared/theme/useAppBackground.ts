import { useEffect, useLayoutEffect } from "react";
import { Appearance, Platform } from "react-native";

export function useAppBackground(
  background: string,
  mode: "system" | "light" | "dark",
) {
  useLayoutEffect(() => {
    void import("expo-system-ui")
      .then(({ setBackgroundColorAsync }) =>
        setBackgroundColorAsync(background),
      )
      .catch(() => undefined);
  }, [background]);
  useEffect(() => {
    if (Platform.OS === "web") return;
    Appearance.setColorScheme(mode === "system" ? "auto" : mode);
    return () => Appearance.setColorScheme("auto");
  }, [mode]);
}
