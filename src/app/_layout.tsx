import { useEffect, useMemo } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { AppState, View, useColorScheme } from "react-native";
import { Stack, ThemeProvider, DefaultTheme, DarkTheme } from "expo-router";
import { useStackOptions } from "../shared/navigation/useStackOptions";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider, focusManager } from "@tanstack/react-query";
import { queryClient } from "../shared/api/query-client";
import { useAppBackground } from "../shared/theme/useAppBackground";
import { lightTheme, darkTheme } from "../shared/theme/theme";
import { useUIStore } from "../shared/store/ui-store";
import { useAuthStore } from "../features/auth/session";
import { useAccountPreferences } from "../features/settings/hooks/useAccountPreferences";
import { useSessionLifecycle } from "../features/auth/hooks/useSessionLifecycle";

const paperSettings = {
  icon: (props: React.ComponentProps<typeof MaterialCommunityIcons>) => (
    <MaterialCommunityIcons {...props} />
  ),
};

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout />
    </QueryClientProvider>
  );
}

function AppLayout() {
  useSessionLifecycle();
  useAccountPreferences();
  const system = useColorScheme();
  const mode = useUIStore((state) => state.themeMode);
  const fontSize = useUIStore((state) => state.fontSize);
  const expiresAt = useAuthStore((state) => state.session?.expiresAt);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const dark = mode === "dark" || (mode === "system" && system === "dark");
  const baseTheme = dark ? darkTheme : lightTheme;
  const theme = useMemo(() => {
    const scale = { sm: 0.9, md: 1, lg: 1.15 }[fontSize];
    return {
      ...baseTheme,
      fonts: Object.fromEntries(
        Object.entries(baseTheme.fonts).map(([name, font]) => [
          name,
          "fontSize" in font
            ? {
                ...font,
                fontSize: font.fontSize * scale,
                lineHeight: font.lineHeight * scale,
              }
            : font,
        ]),
      ) as typeof baseTheme.fonts,
    };
  }, [baseTheme, fontSize]);

  useAppBackground(theme.colors.background, mode);
  const stackOptions = useStackOptions(theme);
  const navigationTheme = {
    ...(dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(dark ? DarkTheme : DefaultTheme).colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onSurface,
      border: theme.colors.outlineVariant,
      notification: theme.colors.error,
    },
  };

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      focusManager.setFocused(state === "active"),
    );
    return () => subscription.remove();
  }, []);

  if (!isInitialized) {
    return (
      <SafeAreaProvider
        style={{ flex: 1, backgroundColor: theme.colors.background }}
      >
        <PaperProvider theme={theme} settings={paperSettings}>
          <StatusBar style={dark ? "light" : "dark"} />
          <View
            style={{
              flex: 1,
              backgroundColor: theme.colors.background,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="large" />
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <PaperProvider theme={theme} settings={paperSettings}>
        <StatusBar style={dark ? "light" : "dark"} />
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <ThemeProvider value={navigationTheme}>
            <Stack screenOptions={stackOptions}>
              <Stack.Screen name="index" options={{ title: "CapituLando" }} />
              <Stack.Protected
                guard={expiresAt === undefined}
                redirectTo="/painel"
              >
                <Stack.Screen name="entrar" options={{ title: "Entrar" }} />
                <Stack.Screen name="cadastro" options={{ title: "Cadastro" }} />
              </Stack.Protected>
              <Stack.Protected guard={expiresAt !== undefined} redirectTo="/">
                <Stack.Screen
                  name="(tabs)"
                  options={{ headerShown: false, title: "Meu espaço" }}
                />
                <Stack.Screen
                  name="escrita"
                  options={{
                    title: "Espaço de escrita",
                    animation:
                      stackOptions.animation === "none"
                        ? "none"
                        : "slide_from_bottom",
                  }}
                />
                <Stack.Screen
                  name="ideias"
                  options={{ title: "Minhas ideias" }}
                />
                <Stack.Screen
                  name="metas"
                  options={{ title: "Minhas metas" }}
                />
                <Stack.Screen
                  name="capitulos/[id]"
                  options={{ title: "Capítulos" }}
                />
                <Stack.Screen
                  name="(account)"
                  options={{ headerShown: false, title: "Minha conta" }}
                />
              </Stack.Protected>
              <Stack.Screen
                name="sobre"
                options={{
                  title: "Sobre o CapituLando",
                  animation:
                    stackOptions.animation === "none" ? "none" : "fade",
                }}
              />
              <Stack.Screen
                name="recuperar-senha"
                options={{ title: "Recuperar senha" }}
              />
              <Stack.Screen
                name="reenviar-confirmacao"
                options={{ title: "Reenviar confirmação" }}
              />
              <Stack.Screen
                name="confirmar-email"
                options={{ title: "Confirmar e-mail" }}
              />
              <Stack.Screen
                name="redefinir-senha"
                options={{ title: "Redefinir senha" }}
              />
            </Stack>
          </ThemeProvider>
        </View>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
