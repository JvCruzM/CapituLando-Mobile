import { Image } from "react-native";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Button, HelperText, Text } from "react-native-paper";
import { Screen } from "../shared/components/Screen";
import { useAuthStore, refreshAuthSession } from "../features/auth/session";
import { loadProfile } from "../features/profile/services/profile-api";
import { ProfileAvatar } from "../shared/components/ProfileAvatar";

export default function HomeScreen() {
  const session = useAuthStore((state) => state.session);
  const signingOut = useAuthStore((state) => state.isSigningOut);
  const sessionError = useAuthStore((state) => state.sessionError);
  const refreshing = useAuthStore((state) => state.isRefreshing);
  const client = useQueryClient();
  const [logoutNotice, setLogoutNotice] = useState("");
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
      {session ? (
        <>
          <Button
            mode="contained"
            icon="view-dashboard"
            onPress={() => router.push("/painel")}
          >
            Meu espaço de escrita
          </Button>
          <Button onPress={() => router.push("/historias")}>
            Minhas histórias
          </Button>
          <Button onPress={() => router.push("/escrita")}>Escrever</Button>
          <Button
            mode="contained-tonal"
            icon="book-open-page-variant"
            accessibilityLabel="Enciclopédia, Personagens & Cronologia"
            onPress={() => router.push("/enciclopedia")}
          >
            Enciclopédia, Personagens & Cronologia
          </Button>
          <Text variant="titleMedium">
            Olá, {profile.data?.displayName ?? session.user.displayName}
          </Text>
          <ProfileAvatar
            uri={profile.data?.avatarImage}
            name={profile.data?.displayName ?? session.user.displayName}
          />
          <Button onPress={() => router.push("/perfil")}>Meu perfil</Button>
          <Button onPress={() => router.push("/configuracoes")}>
            Configurações
          </Button>
          <Button onPress={() => router.push("/backups")}>Backups</Button>
          <Button
            disabled={signingOut}
            loading={signingOut}
            onPress={() => {
              setLogoutNotice("");
              void useAuthStore.getState().logout().then(setLogoutNotice);
            }}
          >
            Encerrar sessão
          </Button>
        </>
      ) : (
        <Button mode="contained" onPress={() => router.push("/entrar")}>
          Entrar
        </Button>
      )}
      {sessionError || logoutNotice ? (
        <HelperText type="error" accessibilityLiveRegion="polite">
          {sessionError || logoutNotice}
        </HelperText>
      ) : null}
      {session && sessionError ? (
        <Button
          accessibilityLabel="Tentar renovar sessão"
          accessibilityState={{ busy: refreshing }}
          disabled={refreshing || signingOut}
          loading={refreshing}
          onPress={() => {
            const version = useAuthStore.getState().sessionVersion;
            void refreshAuthSession()
              .then((current) => {
                if (useAuthStore.getState().sessionVersion === version)
                  return client.invalidateQueries({
                    predicate: (query) =>
                      query.queryKey.includes(current.user.id),
                    refetchType: "all",
                  });
              })
              .catch(() => undefined);
          }}
        >
          {refreshing ? "Renovando sessão…" : "Tentar renovar sessão"}
        </Button>
      ) : null}
      <Button onPress={() => router.push("/sobre")}>
        Sobre o projeto e a equipe
      </Button>
    </Screen>
  );
}
