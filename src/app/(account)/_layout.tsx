import { Stack } from "expo-router";
import { useStackOptions } from "../../shared/navigation/useStackOptions";

export default function AccountLayout() {
  const options = useStackOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="perfil" options={{ title: "Meu perfil" }} />
      <Stack.Screen name="configuracoes" options={{ title: "Configurações" }} />
      <Stack.Screen name="backups" options={{ title: "Backups" }} />
    </Stack>
  );
}
