import { Image } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Button, Text } from "react-native-paper";
import { Screen } from "../shared/components/Screen";
import { useAuthStore } from "../features/auth/session";
import { loadProfile } from "../features/profile/services/profile-api";

export default function HomeScreen() {
  const session = useAuthStore((state) => state.session);
  const clearSession = useAuthStore((state) => state.clearSession);
  const profile = useQuery({
    queryKey: ["profile", session?.user.id ?? ""],
    queryFn: ({ signal }) => loadProfile(signal),
    enabled: Boolean(session),
  });
  return (
    <Screen>
      <Image
        source={require("../../assets/brand/capitulando-logo.png")}
        accessibilityLabel="CapituLando"
        resizeMode="contain"
        style={{ width: "100%", height: 110 }}
      />
      <Text variant="headlineMedium">Cada história começa com uma ideia.</Text>
      <Text variant="bodyLarge">
        Seu espaço para escrever e construir universos, agora no celular.
      </Text>
      <Button
        mode="contained-tonal"
        icon="book-open-page-variant"
        onPress={() => router.push("/enciclopedia")}
      >
        Enciclopédia, Personagens & Cronologia
      </Button>
      {session ? (
        <>
          <Text variant="titleMedium">
            Olá, {profile.data?.displayName ?? session.user.displayName}
          </Text>
          <Button onPress={() => router.push("/perfil")}>Meu perfil</Button>
          <Button onPress={() => router.push("/configuracoes")}>
            Configurações
          </Button>
          <Button onPress={() => router.push("/backups")}>Backups</Button>
          <Button onPress={clearSession}>Encerrar sessão no app</Button>
        </>
      ) : (
        <Button mode="contained" onPress={() => router.push("/entrar")}>
          Entrar
        </Button>
      )}
      <Button onPress={() => router.push("/sobre")}>
        Sobre o projeto e a equipe
      </Button>
    </Screen>
  );
}
