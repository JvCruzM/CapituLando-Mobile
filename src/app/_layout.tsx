import { useEffect, useMemo } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { AppState, View, useColorScheme } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider, focusManager } from "@tanstack/react-query";
import { queryClient } from "../shared/api/query-client";
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

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      focusManager.setFocused(state === "active"),
    );
    return () => subscription.remove();
  }, []);

  if (!isInitialized) {
    return (
      <SafeAreaProvider>
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
    <SafeAreaProvider>
      <PaperProvider theme={theme} settings={paperSettings}>
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
          <Stack.Screen
            name="recuperar-senha"
            options={{ title: "Recuperar senha" }}
          />
          <Stack.Screen
            name="reenviar-confirmacao"
            options={{ title: "Reenviar confirmação" }}
          />
          <Stack.Protected guard={expiresAt !== undefined}>
            <Stack.Screen
              name="enciclopedia"
              options={{ title: "Enciclopédia & Cronologia" }}
            />
            <Stack.Screen name="(account)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Screen
            name="confirmar-email"
            options={{ title: "Confirmar e-mail" }}
          />
          <Stack.Screen
            name="redefinir-senha"
            options={{ title: "Redefinir senha" }}
          />
          <Stack.Protected guard={expiresAt === undefined}>
            <Stack.Screen name="entrar" options={{ title: "Entrar" }} />
            <Stack.Screen name="cadastro" options={{ title: "Cadastro" }} />
          </Stack.Protected>
        </Stack>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
