import { ChapterListModal } from "../../writing/components/ChapterListModal";
import {
  fetchSingleEntryFromApi,
  normalizeItemStatus,
} from "../../writing/writing-store";
import { forgetCachedChapter } from "../../writing/writing-store";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Button,
  Card,
  Dialog,
  HelperText,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";
import { useAuthStore } from "../../auth/session";
import {
  accountRequest,
  accountErrorMessage,
} from "../../../shared/api/account";
import { AccountQueryStatus } from "../../../shared/components/AccountQueryStatus";
import { Screen } from "../../../shared/components/Screen";
import type { WritingEntry } from "../../writing/types";
export default function ChaptersScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const session = useAuthStore((s) => s.session);
  const owner = session?.user.id ?? "";
  const isDark = useTheme().dark;
  const [readingEntry, setReadingEntry] = useState<WritingEntry | null>(null);
  const client = useQueryClient(),
    [deleting, setDeleting] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["chapters", owner, id],
    enabled: Boolean(owner && id),
    queryFn: ({ signal }) =>
      accountRequest<{ chapters: WritingEntry[]; drafts: WritingEntry[] }>({
        url: `/api/writing/stories/${id}/items`,
        signal,
      }),
  });
  const remove = useMutation({
    mutationFn: async (itemId: string) => {
      await accountRequest({
        url: `/api/writing/stories/${id}/items/${itemId}`,
        method: "DELETE",
      });
      await forgetCachedChapter(owner, id, itemId);
    },
    onSuccess: async () => {
      setDeleting(null);
      await client.invalidateQueries({
        predicate: (q) => q.queryKey.includes(owner),
      });
    },
  });
  if (!query.data)
    return (
      <AccountQueryStatus
        error={query.error}
        fetchStatus={query.fetchStatus}
        retry={() => void query.refetch()}
      />
    );
  return (
    <Screen>
      <Text variant="headlineMedium">{title ?? "Capítulos"}</Text>
      <Button
        mode="contained"
        onPress={() =>
          router.push({ pathname: "/escrita", params: { storyId: id } })
        }
      >
        Abrir espaço de escrita
      </Button>
      {!query.data.chapters.length && !query.data.drafts.length && (
        <Text>Nenhum capítulo ou rascunho ainda.</Text>
      )}
      {[...query.data.chapters, ...query.data.drafts].map((c) => (
        <Card key={c.id}>
          <Card.Content>
            <Text variant="titleMedium">{c.title}</Text>
            <Text>
              {c.kind === "draft" ? "Rascunho" : "Capítulo"} · {c.wordCount}{" "}
              palavras
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button
              disabled={remove.isPending}
              onPress={() =>
                setReadingEntry({
                  ...c,
                  status: normalizeItemStatus(c.status, c.kind),
                })
              }
            >
              Ler
            </Button>
            <Button
              onPress={() =>
                router.push({
                  pathname: "/escrita",
                  params: { storyId: id, itemId: c.id, mode: "edit" },
                })
              }
            >
              Editar
            </Button>
            <Button
              disabled={remove.isPending}
              onPress={() => {
                remove.reset();
                setDeleting(c.id);
              }}
            >
              Excluir
            </Button>
          </Card.Actions>
        </Card>
      ))}
      <ChapterListModal
        visible={Boolean(readingEntry)}
        initialEntry={readingEntry}
        kind={readingEntry?.kind ?? "chapter"}
        entries={(readingEntry?.kind === "draft"
          ? query.data.drafts
          : query.data.chapters
        ).map((entry) => ({
          ...entry,
          status: normalizeItemStatus(entry.status, entry.kind),
        }))}
        isDark={isDark}
        disabled={remove.isPending}
        onClose={() => setReadingEntry(null)}
        onBackToList={() => setReadingEntry(null)}
        onLoadEntry={(entry) =>
          fetchSingleEntryFromApi(
            {
              baseUrl: "/",
              userId: owner,
              sessionId: session?.sessionId ?? "",
            },
            id,
            entry.id,
          )
        }
        onOpenInEditor={(entry) => {
          setReadingEntry(null);
          router.push({
            pathname: "/escrita",
            params: { storyId: id, itemId: entry.id, mode: "edit" },
          });
        }}
        onDeleteEntry={async (entry) => {
          await remove.mutateAsync(entry.id);
        }}
      />
      <Portal>
        <Dialog
          visible={Boolean(deleting)}
          dismissable={!remove.isPending}
          onDismiss={() => setDeleting(null)}
        >
          <Dialog.Title>Excluir texto?</Dialog.Title>
          <Dialog.Content>
            <Text>O capítulo será excluído também no web.</Text>
            {remove.error && (
              <HelperText type="error">
                {accountErrorMessage(remove.error)}
              </HelperText>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              disabled={remove.isPending}
              onPress={() => setDeleting(null)}
            >
              Cancelar
            </Button>
            <Button
              disabled={remove.isPending}
              loading={remove.isPending}
              onPress={() => {
                if (deleting) remove.mutate(deleting);
              }}
            >
              Excluir
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}
