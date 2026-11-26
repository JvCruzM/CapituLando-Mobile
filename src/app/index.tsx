import { Image, View } from "react-native";
import { Redirect, router } from "expo-router";
import { Card, HelperText, Icon, Text, useTheme } from "react-native-paper";
import { Button } from "../shared/components/Controls";
import { useUIStore } from "../shared/store/ui-store";
import { Screen } from "../shared/components/Screen";
import { useAuthStore } from "../features/auth/session";
export default function WelcomeScreen() {
  const session = useAuthStore((state) => state.session);
  const theme = useTheme();
  const logoutNotice = useUIStore((state) => state.logoutNotice);
  const setLogoutNotice = useUIStore((state) => state.setLogoutNotice);
  if (session) return <Redirect href="/painel" />;
  return (
    <Screen>
      {logoutNotice ? (
        <Card mode="outlined">
          <Card.Content>
            <HelperText type="error" accessibilityLiveRegion="polite">
              {logoutNotice}
            </HelperText>
          </Card.Content>
          <Card.Actions>
            <Button onPress={() => setLogoutNotice("")}>Fechar aviso</Button>
          </Card.Actions>
        </Card>
      ) : null}
      <Image
        source={require("../../assets/brand/capitulando-logo.png")}
        accessibilityLabel="CapituLando"
        resizeMode="contain"
        style={{ width: "100%", height: 120 }}
      />
      <View
        style={{
          backgroundColor: theme.colors.primaryContainer,
          borderRadius: 24,
          padding: 24,
          gap: 18,
        }}
      >
        <Text
          variant="labelLarge"
          style={{ color: theme.colors.onPrimaryContainer, letterSpacing: 2 }}
        >
          UM LUGAR PARA SUAS HISTÓRIAS
        </Text>
        <Text
          variant="displaySmall"
          style={{ color: theme.colors.onPrimaryContainer }}
        >
          Cada história começa com uma ideia.
        </Text>
        <Text
          variant="bodyLarge"
          style={{ color: theme.colors.onPrimaryContainer }}
        >
          Escreva no seu ritmo. Guarde suas ideias e dê vida a universos que só
          você pode criar.
        </Text>
        <Button
          mode="contained"
          icon="feather"
          onPress={() => router.push("/entrar")}
        >
          Entrar no meu espaço
        </Button>
        <Button mode="outlined" onPress={() => router.push("/cadastro")}>
          Criar minha conta
        </Button>
      </View>
      <Text variant="headlineSmall">Da primeira ideia ao último capítulo</Text>
      {(
        [
          [
            "notebook-outline",
            "Escreva com liberdade",
            "Capítulos, rascunhos e um espaço para encontrar sua voz.",
          ],
          [
            "earth",
            "Construa seu universo",
            "Personagens, lugares e acontecimentos conectados à sua história.",
          ],
          [
            "lightbulb-on-outline",
            "Cultive suas ideias",
            "Inspirações e metas para acompanhar cada passo da escrita.",
          ],
        ] as const
      ).map(([icon, title, description]) => (
        <Card
          key={title}
          mode="outlined"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          }}
        >
          <Card.Content style={{ gap: 10 }}>
            <Icon source={icon} size={26} color={theme.colors.primary} />
            <Text variant="titleMedium">{title}</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {description}
            </Text>
          </Card.Content>
        </Card>
      ))}
      <Button icon="information-outline" onPress={() => router.push("/sobre")}>
        Sobre o projeto e a equipe
      </Button>
    </Screen>
  );
}
