import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Card, HelperText, List, Text, useTheme } from "react-native-paper";
import { Button } from "../../../shared/components/Controls";
import { useUIStore } from "../../../shared/store/ui-store";
import { Screen } from "../../../shared/components/Screen";
import { ProfileAvatar } from "../../../shared/components/ProfileAvatar";
import { useAuthStore, refreshAuthSession } from "../../auth/session";
import { loadProfile } from "../../profile/services/profile-api";

export default function AccountScreen() {
  const session = useAuthStore((state) => state.session);
  const signingOut = useAuthStore((state) => state.isSigningOut);
  const sessionError = useAuthStore((state) => state.sessionError);
  const refreshing = useAuthStore((state) => state.isRefreshing);
  const client = useQueryClient();
  const theme = useTheme();
  const logoutNotice = useUIStore((state) => state.logoutNotice);
  const setLogoutNotice = useUIStore((state) => state.setLogoutNotice);
  const profile = useQuery({
    queryKey: ["profile", session?.user.id ?? ""],
    queryFn: ({ signal }) => loadProfile(signal),
    enabled: Boolean(session),
  });
  if (!session) return null;
  const name = profile.data?.displayName ?? session.user.displayName;
  return (
    <Screen>
      <Text variant="headlineMedium">Seu lugar no CapituLando</Text>
      <Text style={{ color: theme.colors.onSurfaceVariant }}>
        Cuide do seu perfil, das suas preferências e das suas histórias.
      </Text>
      <Card
        mode="outlined"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        }}
      >
        <Card.Content
          style={{ gap: 12, alignItems: "center", paddingVertical: 24 }}
        >
          <ProfileAvatar
            uri={profile.data?.avatarImage}
            name={name}
            size={88}
          />
          <Text variant="headlineSmall">{name}</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            {profile.data?.email ?? "Sua conta de autor"}
          </Text>
        </Card.Content>
      </Card>
      <Card
        mode="outlined"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        }}
      >
        <List.Item
          accessibilityRole="button"
          title="Meu perfil"
          description="Sua apresentação como autor"
          left={(props) => (
            <List.Icon
              {...props}
              icon="account-outline"
              color={theme.colors.primary}
            />
          )}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => router.push("/perfil")}
        />
        <List.Item
          accessibilityRole="button"
          title="Configurações"
          description="Tema, leitura e lembretes"
          left={(props) => (
            <List.Icon
              {...props}
              icon="cog-outline"
              color={theme.colors.primary}
            />
          )}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => router.push("/configuracoes")}
        />
        <List.Item
          accessibilityRole="button"
          title="Backups"
          description="Exporte e restaure seus dados"
          left={(props) => (
            <List.Icon
              {...props}
              icon="cloud-download-outline"
              color={theme.colors.primary}
            />
          )}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => router.push("/backups")}
        />
        <List.Item
          accessibilityRole="button"
          title="Sobre o CapituLando"
          description="O projeto e quem faz parte dele"
          left={(props) => (
            <List.Icon {...props} icon="feather" color={theme.colors.primary} />
          )}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => router.push("/sobre")}
        />
      </Card>
      {sessionError || logoutNotice ? (
        <HelperText type="error" accessibilityLiveRegion="polite">
          {sessionError || logoutNotice}
        </HelperText>
      ) : null}
      {sessionError ? (
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
      <Button
        mode="outlined"
        icon="logout"
        textColor={theme.colors.error}
        disabled={signingOut}
        loading={signingOut}
        onPress={() => {
          setLogoutNotice("");
          void useAuthStore
            .getState()
            .logout()
            .then((message) => {
              if (!useAuthStore.getState().session) setLogoutNotice(message);
            });
        }}
      >
        Encerrar sessão
      </Button>
    </Screen>
  );
}
