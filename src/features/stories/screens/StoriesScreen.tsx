import { useState } from "react";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Dialog, HelperText, Portal, Text } from "react-native-paper";
import { SegmentedButtons } from "../../../shared/components/Controls";
import { Button, TextInput } from "../../../shared/components/Controls";
import { Screen } from "../../../shared/components/Screen";
import { AccountQueryStatus } from "../../../shared/components/AccountQueryStatus";
import {
  accountRequest,
  accountErrorMessage,
} from "../../../shared/api/account";
import { useAuthStore } from "../../auth/session";
import { useStories, type StoryRecord } from "../services/stories-api";

export default function StoriesScreen() {
  const stories = useStories(),
    client = useQueryClient();
  const ownerId = useAuthStore((s) => s.session?.user.id ?? "");
  const [editing, setEditing] = useState<StoryRecord | null>(null);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<StoryRecord["status"]>("DRAFT");
  const [deleting, setDeleting] = useState<StoryRecord | null>(null);
  const refresh = () =>
    client.invalidateQueries({
      predicate: (q) => q.queryKey.includes(ownerId),
    });
  const save = useMutation({
    mutationFn: () =>
      accountRequest({
        url: `/api/stories${editing ? `/${editing.id}` : ""}`,
        method: editing ? "PUT" : "POST",
        data: { ...editing, title: title.trim(), genre, description, status },
      }),
    onSuccess: async () => {
      setEditing(null);
      setTitle("");
      setGenre("");
      setDescription("");
      setStatus("DRAFT");
      await refresh();
    },
  });
  const remove = useMutation({
    mutationFn: () =>
      accountRequest({ url: `/api/stories/${deleting!.id}`, method: "DELETE" }),
    onSuccess: async () => {
      if (editing?.id === deleting?.id) {
        setEditing(null);
        setTitle("");
      }
      setDeleting(null);
      await refresh();
    },
  });
  const busy = save.isPending || remove.isPending;
  if (!stories.data)
    return (
      <AccountQueryStatus
        error={stories.error}
        fetchStatus={stories.fetchStatus}
        retry={() => void stories.refetch()}
      />
    );
  return (
    <Screen>
      <Text variant="headlineMedium">Histórias e livros</Text>
      <TextInput
        label="Título"
        value={title}
        onChangeText={setTitle}
        disabled={busy}
      />
      <TextInput
        label="Gênero"
        value={genre}
        onChangeText={setGenre}
        disabled={busy}
      />
      <TextInput
        label="Descrição"
        value={description}
        onChangeText={setDescription}
        multiline
        disabled={busy}
      />
      <SegmentedButtons
        value={status}
        onValueChange={(v) => setStatus(v as StoryRecord["status"])}
        buttons={[
          { value: "DRAFT", label: "Rascunho", disabled: busy },
          { value: "IN_PROGRESS", label: "Em andamento", disabled: busy },
          { value: "COMPLETED", label: "Concluída", disabled: busy },
        ]}
      />
      <Button
        mode="contained"
        loading={save.isPending}
        disabled={busy || !title.trim()}
        onPress={() => save.mutate()}
      >
        {editing ? "Salvar alterações" : "Criar história"}
      </Button>
      {editing && (
        <Button
          disabled={busy}
          onPress={() => {
            setEditing(null);
            setTitle("");
            setGenre("");
            setDescription("");
            setStatus("DRAFT");
          }}
        >
          Cancelar edição
        </Button>
      )}
      {save.error && (
        <HelperText type="error">{accountErrorMessage(save.error)}</HelperText>
      )}
      {stories.error && (
        <HelperText type="error">
          {accountErrorMessage(stories.error)}
        </HelperText>
      )}
      <Button
        disabled={busy || stories.isFetching}
        loading={stories.isFetching}
        onPress={() => void stories.refetch()}
      >
        Atualizar histórias
      </Button>
      {!stories.data.length && (
        <Text>Nenhuma história ainda. Crie seu primeiro projeto acima.</Text>
      )}
      {stories.data.map((s) => (
        <Card key={s.id}>
          <Card.Content>
            <Text variant="titleLarge">{s.title}</Text>
            <Text>{s.genre}</Text>
            <Text>{s.description}</Text>
            <Text>
              {s.chapterCount} capítulos · {s.wordCount} palavras
            </Text>
          </Card.Content>
          <Card.Actions style={{ flexWrap: "wrap" }}>
            <Button
              disabled={busy}
              onPress={() =>
                router.push({ pathname: "/escrita", params: { storyId: s.id } })
              }
            >
              Escrever
            </Button>
            <Button
              disabled={busy}
              onPress={() =>
                router.push({
                  pathname: "/capitulos/[id]",
                  params: { id: s.id, title: s.title },
                })
              }
            >
              Capítulos
            </Button>
            <Button
              disabled={busy}
              onPress={() => {
                save.reset();
                setEditing(s);
                setTitle(s.title);
                setGenre(s.genre ?? "");
                setDescription(s.description ?? "");
                setStatus(s.status);
              }}
            >
              Editar
            </Button>
            <Button
              disabled={busy}
              onPress={() => {
                remove.reset();
                setDeleting(s);
              }}
            >
              Excluir
            </Button>
          </Card.Actions>
        </Card>
      ))}
      <Portal>
        <Dialog
          visible={Boolean(deleting)}
          dismissable={!busy}
          onDismiss={() => setDeleting(null)}
        >
          <Dialog.Title>Excluir {deleting?.title}?</Dialog.Title>
          <Dialog.Content>
            <Text>
              Os capítulos, registros do universo e vínculos desta história
              também serão excluídos da sua conta.
            </Text>
            {remove.error && (
              <HelperText type="error">
                {accountErrorMessage(remove.error)}
              </HelperText>
            )}
          </Dialog.Content>
          <Dialog.Actions style={{ flexWrap: "wrap", gap: 8 }}>
            <Button disabled={busy} onPress={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button
              disabled={busy}
              loading={remove.isPending}
              onPress={() => remove.mutate()}
            >
              Excluir história
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}
