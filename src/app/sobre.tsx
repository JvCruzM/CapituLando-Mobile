import { Image, View } from "react-native";
import { router } from "expo-router";
import { Avatar, Card, Icon, Text, useTheme } from "react-native-paper";
import { SegmentedButtons } from "../shared/components/Controls";
import { Button } from "../shared/components/Controls";
import { Screen } from "../shared/components/Screen";
import { useUIStore } from "../shared/store/ui-store";
import { useAuthStore } from "../features/auth/session";

const team = [
  {
    name: "João Vitor",
    initials: "JV",
    frontend: "Autenticação, perfil, configurações e navegação.",
    backend: "Estrutura, banco, raças, criaturas, itens, backups e deploy.",
  },
  {
    name: "Elidiane Moniky",
    initials: "EM",
    frontend: "Painel de progresso, livros, ideias e metas.",
    backend: "Histórias, ideias, metas e dados do painel.",
  },
  {
    name: "Jamilly Vitória",
    initials: "JA",
    frontend: "Espaço de escrita, capítulos, rascunhos e recuperação.",
    backend:
      "Persistência da escrita, versões, conflitos e tratamento de erros.",
  },
  {
    name: "Nerisson Valdomiro",
    initials: "NV",
    frontend: "Enciclopédia, temas, componentes visuais e Sobre.",
  },
  {
    name: "Márcio Henrique",
    initials: "MH",
    frontend: "Personagens, relacionamentos, eventos e cronologia.",
    backend:
      "Personagens, vínculos, locais, organizações, eventos e segurança.",
  },
  {
    name: "João Marcos",
    initials: "JM",
    backend:
      "Autenticação, e-mails, perfil, preferências e segurança das sessões.",
  },
];
export default function AboutScreen() {
  const theme = useTheme();
  const { themeMode, setThemeMode } = useUIStore();
  const signedIn = useAuthStore((state) => Boolean(state.session));
  const cardStyle = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.outlineVariant,
  };
  return (
    <Screen>
      <View
        style={{
          borderRadius: 24,
          backgroundColor: theme.colors.primaryContainer,
          padding: 24,
          gap: 16,
        }}
      >
        <Image
          source={require("../../assets/brand/capitulando-logo.png")}
          accessibilityLabel="CapituLando"
          resizeMode="contain"
          style={{ height: 90, width: "100%" }}
        />
        <Text
          variant="labelLarge"
          style={{ color: theme.colors.onPrimaryContainer, letterSpacing: 2 }}
        >
          SOBRE O PROJETO
        </Text>
        <Text
          variant="displaySmall"
          accessibilityRole="header"
          style={{ color: theme.colors.onPrimaryContainer }}
        >
          Histórias merecem um lugar para crescer.
        </Text>
        <Text
          variant="bodyLarge"
          style={{ color: theme.colors.onPrimaryContainer }}
        >
          O CapituLando reúne a escrita e a construção de universos em um espaço
          pensado para quem tem histórias para contar.
        </Text>
      </View>
      <Text variant="headlineSmall" accessibilityRole="header">
        Da imaginação para a página
      </Text>
      <Text
        variant="bodyLarge"
        style={{ color: theme.colors.onSurfaceVariant }}
      >
        Organize livros, guarde ideias e acompanhe suas metas. Escreva
        capítulos, desenvolva personagens e conecte os acontecimentos do seu
        universo no seu próprio ritmo.
      </Text>
      {(
        [
          [
            "feather",
            "Escrita com espaço para criar",
            "Capítulos, rascunhos, modo foco e recursos para recuperar o trabalho e resolver conflitos entre sessões.",
          ],
          [
            "earth",
            "Um universo de possibilidades",
            "Personagens, povos, criaturas, objetos, lugares e acontecimentos para dar consistência à sua narrativa.",
          ],
          [
            "book-sync-outline",
            "Sua história continua com você",
            "Use a mesma conta no web e no mobile. Seus dados salvos ficam disponíveis nas duas versões quando você está conectado.",
          ],
        ] as const
      ).map(([icon, title, description]) => (
        <Card key={title} mode="outlined" style={cardStyle}>
          <Card.Content style={{ gap: 10 }}>
            <Icon source={icon} size={28} color={theme.colors.primary} />
            <Text variant="titleMedium">{title}</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {description}
            </Text>
          </Card.Content>
        </Card>
      ))}
      <View style={{ gap: 8, paddingTop: 8 }}>
        <Text
          variant="labelLarge"
          style={{ color: theme.colors.primary, letterSpacing: 2 }}
        >
          QUEM CONSTRÓI O CAPITULANDO
        </Text>
        <Text variant="headlineSmall" accessibilityRole="header">
          Uma equipe, muitas ideias
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          Um projeto acadêmico construído em equipe, a partir da base da
          aplicação web.
        </Text>
      </View>
      {team.map((person) => (
        <Card key={person.name} mode="outlined" style={cardStyle}>
          <Card.Content style={{ gap: 12 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Avatar.Text
                size={42}
                label={person.initials}
                style={{ backgroundColor: theme.colors.primaryContainer }}
                color={theme.colors.onPrimaryContainer}
              />
              <Text variant="titleMedium" style={{ flex: 1 }}>
                {person.name}
              </Text>
            </View>
            {person.frontend ? (
              <View style={{ gap: 4 }}>
                <Text
                  variant="labelMedium"
                  style={{ color: theme.colors.primary }}
                >
                  FRONTEND MOBILE
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {person.frontend}
                </Text>
              </View>
            ) : null}
            {person.backend ? (
              <View style={{ gap: 4 }}>
                <Text
                  variant="labelMedium"
                  style={{ color: theme.colors.primary }}
                >
                  BACKEND EXPRESS
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {person.backend}
                </Text>
              </View>
            ) : null}
          </Card.Content>
        </Card>
      ))}
      <Card mode="outlined" style={cardStyle}>
        <Card.Content style={{ gap: 14 }}>
          <Text variant="titleMedium">Do seu jeito</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Escolha uma aparência confortável para acompanhar sua leitura e sua
            escrita.
          </Text>
          {signedIn ? (
            <Button
              mode="outlined"
              icon="palette-outline"
              onPress={() => router.push("/configuracoes")}
            >
              Ajustar aparência
            </Button>
          ) : (
            <>
              <SegmentedButtons
                value={themeMode}
                onValueChange={(value) =>
                  setThemeMode(value as typeof themeMode)
                }
                buttons={[
                  { value: "system", label: "Sistema" },
                  { value: "light", label: "Claro" },
                  { value: "dark", label: "Escuro" },
                ]}
              />
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Esta escolha vale para a sessão atual.
              </Text>
            </>
          )}
        </Card.Content>
      </Card>
      <Text
        variant="bodySmall"
        style={{
          textAlign: "center",
          color: theme.colors.onSurfaceVariant,
          paddingVertical: 12,
        }}
      >
        CapituLando · Cada história começa com uma ideia.
      </Text>
    </Screen>
  );
}
