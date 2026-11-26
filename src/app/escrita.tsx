import { useEffect, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Text } from "react-native-paper";
import { Button } from "../shared/components/Controls";
import { useAuthStore } from "../features/auth/session";
import { WritingScreen, fetchStoriesFromApi } from "../features/writing";
import { AccountQueryStatus } from "../shared/components/AccountQueryStatus";
import { Screen } from "../shared/components/Screen";

export default function WritingRoute() {
  const session = useAuthStore((state) => state.session);
  return session ? (
    <WritingRouteContent
      key={session.user.id}
      ownerId={session.user.id}
      sessionId={session.sessionId}
    />
  ) : null;
}
function WritingRouteContent({
  ownerId,
  sessionId,
}: {
  ownerId: string;
  sessionId: string;
}) {
  const params = useLocalSearchParams<{
    storyId?: string;
    itemId?: string;
    mode?: "read" | "edit";
  }>();
  const [selected, setSelected] = useState(params.storyId ?? "");
  useEffect(() => {
    if (params.storyId) setSelected(params.storyId);
  }, [params.storyId]);
  const client = useQueryClient();
  const baseUrl = "/";
  const stories = useQuery({
    queryKey: ["writing-stories", ownerId],
    queryFn: () => fetchStoriesFromApi({ baseUrl, userId: ownerId, sessionId }),
  });
  if (!stories.data)
    return (
      <AccountQueryStatus
        error={stories.error}
        fetchStatus={stories.fetchStatus}
        retry={() => void stories.refetch()}
      />
    );
  const storyId = stories.data.some((s) => s.id === selected)
    ? selected
    : stories.data[0]?.id;
  if (!storyId)
    return (
      <Screen>
        <Text>Crie uma história para começar a escrever.</Text>
        <Button onPress={() => router.push("/historias")}>
          Minhas histórias
        </Button>
      </Screen>
    );
  return (
    <WritingScreen
      key={`${ownerId}:${storyId}:${params.itemId ?? ""}:${params.mode ?? ""}`}
      initialItemId={params.storyId === storyId ? params.itemId : undefined}
      initialMode={params.mode}
      userId={ownerId}
      storyId={storyId}
      stories={stories.data}
      onSelectStory={setSelected}
      apiBaseUrl={baseUrl}
      onDataChanged={() =>
        void client.invalidateQueries({
          predicate: (q) => q.queryKey.includes(ownerId),
        })
      }
    />
  );
}
