import { Stack } from "expo-router";
import { useTheme } from "react-native-paper";

export default function AccountLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="perfil" options={{ title: "Meu perfil" }} />
      <Stack.Screen name="configuracoes" options={{ title: "Configurações" }} />
      <Stack.Screen name="backups" options={{ title: "Backups" }} />
    </Stack>
  );
}
