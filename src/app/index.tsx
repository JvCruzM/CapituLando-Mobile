import { Image } from "react-native";
import { router } from "expo-router";
import { Button, Text } from "react-native-paper";
import { Screen } from "../shared/components/Screen";
import { useAuthStore } from "../features/auth/session";

export default function HomeScreen() {
  const session = useAuthStore((state) => state.session);
  const clearSession = useAuthStore((state) => state.clearSession);
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
      {session ? (
        <>
          <Text variant="titleMedium">Olá, {session.user.displayName}</Text>
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
