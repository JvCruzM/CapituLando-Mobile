import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Chip,
  Dialog,
  HelperText,
  Portal,
  Searchbar,
  SegmentedButtons,
  Text,
} from "react-native-paper";
import { Screen } from "../../../shared/components/Screen";
import { AccountQueryStatus } from "../../../shared/components/AccountQueryStatus";
import { accountErrorMessage } from "../../../shared/api/account";
import { useAuthStore } from "../../auth/session";
import { useUniverseStore, useUniverseStats } from "../universe-store";
import { EncyclopediaView } from "../components/EncyclopediaView";
import { CharactersView } from "../components/CharactersView";
import { TimelineView } from "../components/TimelineView";
import { ItemDetailModal } from "../components/ItemDetailModal";
import { CreateEditModal, type FormMode } from "../components/CreateEditModal";
import {
  canEditEntry,
  deleteEncyclopedia,
  editableCategories,
  loadUniverse,
  loadUniverseStories,
  saveEncyclopedia,
  storiesKey,
  universeKey,
} from "../services/universe-api";
import type {
  EncyclopediaItem,
  CharacterItem,
  TimelineEventItem,
  UniverseTab,
} from "../types";

type Target =
  | { type: "encyclopedia"; data: EncyclopediaItem }
  | { type: "character"; data: CharacterItem }
  | { type: "timeline"; data: TimelineEventItem };

export function UniverseScreen() {
  const ownerId = useAuthStore((state) => state.session?.user.id ?? "");
  return <UniverseContent key={ownerId} ownerId={ownerId} />;
}

function UniverseContent({ ownerId }: { ownerId: string }) {
  const client = useQueryClient();
  const [selectedStory, setSelectedStory] = useState("");
  const [detail, setDetail] = useState<Target | null>(null);
  const [form, setForm] = useState<FormMode>(null);
  const [deleting, setDeleting] = useState<EncyclopediaItem | null>(null);
  const activeTab = useUniverseStore((state) => state.activeTab);
  const setActiveTab = useUniverseStore((state) => state.setActiveTab);
  const selectedCategory = useUniverseStore((state) => state.selectedCategory);
  const search = useUniverseStore((state) => state.searchQuery);
  const setSearch = useUniverseStore((state) => state.setSearchQuery);
  const snapshotKey = useUniverseStore((state) => state.snapshotKey);
  const stats = useUniverseStats();
  const stories = useQuery({
    queryKey: storiesKey(ownerId),
    queryFn: ({ signal }) => loadUniverseStories(signal),
    enabled: Boolean(ownerId),
  });
  const storyId = stories.data?.some((story) => story.id === selectedStory)
    ? selectedStory
    : (stories.data?.[0]?.id ?? "");
  const snapshot = useQuery({
    queryKey: universeKey(ownerId, storyId),
    queryFn: ({ signal }) => loadUniverse(storyId, signal),
    enabled: Boolean(ownerId && storyId),
  });
  const currentKey = `${ownerId}:${storyId}`;
  useEffect(() => {
    if (snapshot.data && ownerId && storyId)
      useUniverseStore.getState().setSnapshot(currentKey, snapshot.data);
  }, [snapshot.data, currentKey, ownerId, storyId]);

  const save = useMutation({
    mutationFn: async ({
      item,
      id,
    }: {
      item: Omit<EncyclopediaItem, "id" | "createdAt" | "updatedAt">;
      id?: string;
    }) => {
      const original = id
        ? snapshot.data?.encyclopediaItems.find((entry) => entry.id === id)
        : undefined;
      if (id && !original)
        throw new Error("A entrada mudou. Atualize os dados antes de editar.");
      await saveEncyclopedia(storyId, item, original);
    },
    onSuccess: () =>
      client.invalidateQueries({ queryKey: universeKey(ownerId, storyId) }),
  });
  const remove = useMutation({
    mutationFn: (item: EncyclopediaItem) => deleteEncyclopedia(storyId, item),
    async onSuccess() {
      setDeleting(null);
      setDetail(null);
      await client.invalidateQueries({
        queryKey: universeKey(ownerId, storyId),
      });
    },
  });
  const busy = save.isPending || remove.isPending;

  if (!stories.data)
    return (
      <AccountQueryStatus
        error={stories.error}
        retry={() => void stories.refetch()}
      />
    );
  if (!stories.data.length)
    return (
      <Screen>
        <Text variant="headlineMedium">Enciclopédia</Text>
        <Text>
          Você ainda não tem histórias. Crie uma história no web para começar a
          construir seu universo.
        </Text>
        <Button onPress={() => void stories.refetch()}>
          Atualizar histórias
        </Button>
      </Screen>
    );
  if (!snapshot.data || snapshotKey !== currentKey)
    return (
      <AccountQueryStatus
        error={snapshot.error}
        retry={() => void snapshot.refetch()}
      />
    );

  const writableCategory =
    selectedCategory === "all" ||
    editableCategories.some((category) => category === selectedCategory);
  return (
    <Screen>
      <Text variant="headlineSmall" accessibilityRole="header">
        Bíblia do Universo
      </Text>
      <Text>
        Selecione a história. Os dados são compartilhados com sua conta no web.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {stories.data.map((story) => (
          <Chip
            key={story.id}
            selected={story.id === storyId}
            disabled={busy}
            onPress={() => {
              if (busy || story.id === storyId) return;
              useUniverseStore.getState().reset();
              setSelectedStory(story.id);
              setDetail(null);
              setForm(null);
              setDeleting(null);
              save.reset();
              remove.reset();
            }}
          >
            {story.title}
          </Chip>
        ))}
      </ScrollView>
      <Button
        disabled={busy || snapshot.isFetching}
        loading={snapshot.isFetching}
        onPress={() => {
          void client.invalidateQueries({ queryKey: storiesKey(ownerId) });
          void client.invalidateQueries({
            queryKey: universeKey(ownerId, storyId),
          });
        }}
      >
        Atualizar dados
      </Button>
      {snapshot.error ? (
        <HelperText type="error">
          {accountErrorMessage(snapshot.error)}
        </HelperText>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Chip>{stats.totalEncyclopedia} Entradas</Chip>
        <Chip>{stats.totalCharacters} Personagens</Chip>
        <Chip>{stats.totalTimeline} Eventos</Chip>
      </View>
      <SegmentedButtons
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as UniverseTab)}
        buttons={[
          { value: "encyclopedia", label: "Enciclopédia", disabled: busy },
          { value: "characters", label: "Personagens", disabled: busy },
          { value: "timeline", label: "Cronologia", disabled: busy },
        ]}
      />
      <Searchbar
        placeholder="Buscar no universo"
        accessibilityLabel="Buscar no universo"
        value={search}
        onChangeText={setSearch}
      />
      {activeTab === "encyclopedia" && writableCategory ? (
        <Button
          mode="contained-tonal"
          icon="plus"
          accessibilityLabel="Nova Entrada"
          disabled={busy}
          onPress={() => {
            save.reset();
            setForm({
              mode: "create",
              targetType: "encyclopedia",
              defaultCategory:
                selectedCategory === "all" ? "races" : selectedCategory,
            });
          }}
        >
          Nova Entrada
        </Button>
      ) : null}
      <Text>
        Raças, criaturas e itens podem ser editados aqui. As demais seções estão
        disponíveis para consulta enquanto suas APIs de edição são integradas.
      </Text>
      {activeTab === "encyclopedia" ? (
        <EncyclopediaView
          onSelectItem={(data) => setDetail({ type: "encyclopedia", data })}
        />
      ) : null}
      {activeTab === "characters" ? (
        <CharactersView
          onSelectCharacter={(data) => setDetail({ type: "character", data })}
        />
      ) : null}
      {activeTab === "timeline" ? (
        <TimelineView
          onSelectEvent={(data) => setDetail({ type: "timeline", data })}
        />
      ) : null}
      <ItemDetailModal
        target={detail}
        visible={Boolean(detail)}
        onDismiss={() => setDetail(null)}
        editable={detail?.type === "encyclopedia" && canEditEntry(detail.data)}
        onEdit={(target) => {
          if (target?.type !== "encyclopedia" || !canEditEntry(target.data))
            return;
          save.reset();
          setDetail(null);
          setForm({
            mode: "edit",
            targetType: "encyclopedia",
            item: target.data,
          });
        }}
        onDelete={(target) => {
          if (target?.type !== "encyclopedia" || !canEditEntry(target.data))
            return;
          remove.reset();
          setDetail(null);
          setDeleting(target.data);
        }}
      />
      <CreateEditModal
        formMode={form}
        visible={Boolean(form)}
        onDismiss={() => setForm(null)}
        onSaveEncyclopedia={async (item, id) => {
          await save.mutateAsync({ item, id });
        }}
        onSaveCharacter={() => {
          throw new Error("A edição de personagens ainda não está disponível.");
        }}
        onSaveTimeline={() => {
          throw new Error("A edição da cronologia ainda não está disponível.");
        }}
      />
      <Portal>
        <Dialog
          visible={Boolean(deleting)}
          dismissable={!busy}
          onDismiss={() => setDeleting(null)}
        >
          <Dialog.Title>Excluir registro?</Dialog.Title>
          <Dialog.Content>
            <Text>
              Excluir {deleting?.name}? Esta ação será salva na sua conta e não
              pode ser desfeita.
            </Text>
            {remove.error ? (
              <HelperText type="error">
                {accountErrorMessage(remove.error)}
              </HelperText>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={busy} onPress={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button
              loading={remove.isPending}
              disabled={busy}
              onPress={() => deleting && remove.mutate(deleting)}
            >
              Confirmar Exclusão
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}
