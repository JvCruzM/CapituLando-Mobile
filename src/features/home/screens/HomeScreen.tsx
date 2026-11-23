import { View } from "react-native";
import { Button, Card, ProgressBar, Text } from "react-native-paper";
import { router } from "expo-router";
import { Screen } from "../../../shared/components/Screen";
import { AccountQueryStatus } from "../../../shared/components/AccountQueryStatus";
import { useStories } from "../../stories/services/stories-api";
import {
  useWorkspaceSection,
  type WorkspaceGoal,
  type WorkspaceIdea,
} from "../../workspace/services/workspace-api";
export default function HomeScreen() {
  const stories = useStories(),
    goals = useWorkspaceSection<WorkspaceGoal>("goals"),
    ideas = useWorkspaceSection<WorkspaceIdea>("ideas");
  if (!stories.data || !goals.data || !ideas.data)
    return (
      <AccountQueryStatus
        error={stories.error ?? goals.error ?? ideas.error}
        fetchStatus={
          [stories.fetchStatus, goals.fetchStatus, ideas.fetchStatus].includes(
            "fetching",
          )
            ? "fetching"
            : "idle"
        }
        retry={() => {
          void stories.refetch();
          void goals.refetch();
          void ideas.refetch();
        }}
      />
    );
  const completed = goals.items.filter((g) => g.completed).length,
    progress = goals.items.length ? completed / goals.items.length : 0;
  return (
    <Screen>
      <Text variant="headlineMedium">Meu espaço de escrita</Text>
      <Text>Histórias, ideias e metas da sua conta.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {[
          ["Histórias", stories.data.length],
          ["Ideias", ideas.items.length],
          ["Metas concluídas", `${completed}/${goals.items.length}`],
        ].map(([label, value]) => (
          <Card key={label}>
            <Card.Content>
              <Text>{label}</Text>
              <Text variant="headlineLarge">{value}</Text>
            </Card.Content>
          </Card>
        ))}
      </View>
      <Text>
        {stories.data.reduce((total, s) => total + s.wordCount, 0)} palavras
        escritas
      </Text>
      <ProgressBar progress={progress} />
      <Text>{Math.round(progress * 100)}% das metas concluídas</Text>
      <Button mode="contained" onPress={() => router.push("/historias")}>
        Minhas histórias
      </Button>
      <Button onPress={() => router.push("/escrita")}>Espaço de escrita</Button>
      <Button onPress={() => router.push("/ideias")}>Minhas ideias</Button>
      <Button onPress={() => router.push("/metas")}>Minhas metas</Button>
      <Button
        onPress={() => {
          void stories.refetch();
          void goals.refetch();
          void ideas.refetch();
        }}
      >
        Atualizar painel
      </Button>
    </Screen>
  );
}
