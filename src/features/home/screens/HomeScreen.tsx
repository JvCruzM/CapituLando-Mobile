import { View } from "react-native";
import {
  Button,
  Card,
  HelperText,
  ProgressBar,
  Text,
} from "react-native-paper";
import { router } from "expo-router";
import { Screen } from "../../../shared/components/Screen";
import { AccountQueryStatus } from "../../../shared/components/AccountQueryStatus";
import { accountErrorMessage } from "../../../shared/api/account";
import { useStories } from "../../stories/services/stories-api";
import { useDashboard } from "../services/dashboard-api";
const statusLabels = {
  DRAFT: "Rascunho",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
};
export default function HomeScreen() {
  const stories = useStories(),
    dashboard = useDashboard();
  if (!stories.data || !dashboard.data)
    return (
      <AccountQueryStatus
        error={stories.error ?? dashboard.error}
        fetchStatus={
          [stories.fetchStatus, dashboard.fetchStatus].includes("fetching")
            ? "fetching"
            : "idle"
        }
        retry={() => {
          void stories.refetch();
          void dashboard.refetch();
        }}
      />
    );
  const summary = dashboard.data,
    refreshing = stories.isFetching || dashboard.isFetching;
  return (
    <Screen>
      <Text variant="headlineMedium">Meu espaço de escrita</Text>
      <Text>Histórias, ideias e metas da sua conta.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {[
          ["Histórias", summary.storyCount],
          ["Capítulos e rascunhos", summary.chapterCount],
          ["Ideias", summary.ideaCount],
          [
            "Metas concluídas",
            summary.goals.completed + "/" + summary.goals.total,
          ],
        ].map(([label, value]) => (
          <Card key={label}>
            <Card.Content>
              <Text>{label}</Text>
              <Text variant="headlineLarge">{value}</Text>
            </Card.Content>
          </Card>
        ))}
      </View>
      <Text>{summary.wordCount} palavras escritas</Text>
      <ProgressBar
        accessibilityLabel="Progresso das metas"
        progress={Math.max(0, Math.min(1, summary.goals.percentage / 100))}
      />
      <Text>{summary.goals.percentage}% das metas concluídas</Text>
      <Text variant="titleLarge">Livros recentes</Text>
      {!stories.data.length && (
        <Text>Crie sua primeira história para começar a escrever.</Text>
      )}
      {stories.data.slice(0, 5).map((story) => (
        <Card key={story.id}>
          <Card.Content>
            <Text variant="titleMedium">{story.title}</Text>
            <Text>
              {story.genre || "Gênero não informado"} ·{" "}
              {statusLabels[story.status]}
            </Text>
            <Text>
              {story.chapterCount} textos · {story.wordCount} palavras
            </Text>
            <ProgressBar
              accessibilityLabel={"Progresso de publicação de " + story.title}
              progress={Math.max(
                0,
                Math.min(1, story.progressPercentage / 100),
              )}
            />
            <Text>
              {story.status === "COMPLETED"
                ? "Livro concluído"
                : story.progressPercentage + "% de textos publicados"}
            </Text>
          </Card.Content>
          <Card.Actions style={{ flexWrap: "wrap" }}>
            <Button
              accessibilityLabel={"Ver capítulos de " + story.title}
              onPress={() =>
                router.push({
                  pathname: "/capitulos/[id]",
                  params: { id: story.id, title: story.title },
                })
              }
            >
              Capítulos
            </Button>
            <Button
              accessibilityLabel={"Escrever em " + story.title}
              onPress={() =>
                router.push({
                  pathname: "/escrita",
                  params: { storyId: story.id },
                })
              }
            >
              Escrever
            </Button>
          </Card.Actions>
        </Card>
      ))}
      <Button mode="contained" onPress={() => router.push("/historias")}>
        Minhas histórias
      </Button>
      <Button onPress={() => router.push("/escrita")}>Espaço de escrita</Button>
      <Button onPress={() => router.push("/ideias")}>Minhas ideias</Button>
      <Button onPress={() => router.push("/metas")}>Minhas metas</Button>
      {(stories.error || dashboard.error) && (
        <HelperText type="error">
          {accountErrorMessage(stories.error ?? dashboard.error)}
        </HelperText>
      )}
      <Button
        disabled={refreshing}
        loading={refreshing}
        onPress={() => {
          void stories.refetch();
          void dashboard.refetch();
        }}
      >
        Atualizar painel
      </Button>
    </Screen>
  );
}
