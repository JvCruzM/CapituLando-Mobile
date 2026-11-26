import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useTheme, type MD3Theme } from "react-native-paper";
import type { NativeStackNavigationOptions } from "expo-router";
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value);
      })
      .catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  return reduced;
}
export function useStackOptions(
  override?: MD3Theme,
): NativeStackNavigationOptions {
  const inheritedTheme = useTheme();
  const theme = override ?? inheritedTheme;
  const reduced = useReducedMotion();
  return {
    animation: reduced ? "none" : "slide_from_right",
    headerStyle: { backgroundColor: theme.colors.surface },
    headerTintColor: theme.colors.primary,
    headerTitleStyle: {
      fontFamily: theme.fonts.titleLarge.fontFamily,
      fontWeight: "600",
    },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: theme.colors.background },
  };
}
