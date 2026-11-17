import { useEffect } from "react";
import { AppState, useColorScheme } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider, focusManager } from "@tanstack/react-query";
import { queryClient } from "../shared/api/query-client";
import { lightTheme, darkTheme } from "../shared/theme/theme";
import { useUIStore } from "../shared/store/ui-store";
import { useAuthStore } from "../features/auth/session";

export default function RootLayout() {
  const system = useColorScheme();
  const mode = useUIStore((state) => state.themeMode);
  const expiresAt = useAuthStore((state) => state.session?.expiresAt);
  const dark = mode === "dark" || (mode === "system" && system === "dark");
  const theme = dark ? darkTheme : lightTheme;
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      focusManager.setFocused(state === "active"),
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (expiresAt === undefined) return;
    const timer = setTimeout(
      () => {
        const state = useAuthStore.getState();
        if (state.session?.expiresAt === expiresAt) state.clearSession();
      },
      Math.min(2_147_483_647, Math.max(0, expiresAt - Date.now())),
    );
    return () => clearTimeout(timer);
  }, [expiresAt]);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <StatusBar style={dark ? "light" : "dark"} />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.colors.surface },
              headerTintColor: theme.colors.onSurface,
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          >
            <Stack.Screen name="index" options={{ title: "CapituLando" }} />
            <Stack.Screen name="sobre" options={{ title: "Sobre" }} />
            <Stack.Protected guard={expiresAt === undefined}>
              <Stack.Screen name="entrar" options={{ title: "Entrar" }} />
              <Stack.Screen name="cadastro" options={{ title: "Cadastro" }} />
            </Stack.Protected>
          </Stack>
        </PaperProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
