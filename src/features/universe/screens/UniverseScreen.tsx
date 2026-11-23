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
import { useCharactersWorkspace } from "../../characters/hooks/useCharacters";
import { useTimelineWorkspace } from "../../timeline/hooks/useTimeline";
import { CharacterRelationsModal } from "../../characters/components/CharacterRelationsModal";

type Target =
  | { type: "encyclopedia"; data: EncyclopediaItem }
  | { type: "character"; data: CharacterItem }
  | { type: "timeline"; data: TimelineEventItem };

type DeleteTarget =
  | { kind: "encyclopedia"; item: EncyclopediaItem; label: string }
  | { kind: "character"; id: string; label: string }
  | { kind: "timeline"; id: string; label: string }
  | null;

export function UniverseScreen() {
  const ownerId = useAuthStore((state) => state.session?.user.id ?? "");
  return <UniverseContent key={ownerId} ownerId={ownerId} />;
}

function UniverseContent({ ownerId }: { ownerId: string }) {
  const client = useQueryClient();
  const [selectedStory, setSelectedStory] = useState("");
  const [detail, setDetail] = useState<Target | null>(null);
  const [form, setForm] = useState<FormMode>(null);
  const [deleting, setDeleting] = useState<DeleteTarget>(null);
  const [relationsCharacterId, setRelationsCharacterId] = useState<
    string | null
  >(null);

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

  const charactersWorkspace = useCharactersWorkspace(ownerId, storyId);
  const timelineWorkspace = useTimelineWorkspace(ownerId, storyId);

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
    mutationFn: async (target: NonNullable<DeleteTarget>) => {
      if (target.kind === "encyclopedia") {
        await deleteEncyclopedia(storyId, target.item);
      } else if (target.kind === "character") {
        await charactersWorkspace.removeCharacter(target.id);
      } else if (target.kind === "timeline") {
        await timelineWorkspace.removeEvent(target.id);
      }
    },
    async onSuccess() {
      setDeleting(null);
      setDetail(null);
      await client.invalidateQueries({
        queryKey: universeKey(ownerId, storyId),
      });
    },
  });

  const busy =
    save.isPending ||
    remove.isPending ||
    charactersWorkspace.isMutating ||
    timelineWorkspace.isMutating;

  if (!stories.data)
    return (
      <AccountQueryStatus
        error={stories.error}
        fetchStatus={stories.fetchStatus}
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
        fetchStatus={snapshot.fetchStatus}
        retry={() => void snapshot.refetch()}
      />
    );

  const writableCategory =
    selectedCategory === "all" ||
    editableCategories.some((category) => category === selectedCategory);

  const isLegacyTimelineEvent = (id: string) => id.startsWith("chronology:");

  const canEditTarget = (target: Target | null) => {
    if (!target) return false;
    if (target.type === "encyclopedia") return canEditEntry(target.data);
    if (target.type === "character") return true;
    if (target.type === "timeline") return !isLegacyTimelineEvent(target.data.id);
    return false;
  };

  const activeRelationsCharacter =
    charactersWorkspace.characters.find(
      (item) => item.id === relationsCharacterId,
    ) ?? null;

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
              setRelationsCharacterId(null);
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

      {activeTab === "characters" ? (
        <Button
          mode="contained-tonal"
          icon="account-plus"
          accessibilityLabel="Novo Personagem"
          disabled={busy}
          onPress={() => {
            setForm({
              mode: "create",
              targetType: "character",
            });
          }}
        >
          Novo Personagem
        </Button>
      ) : null}

      {activeTab === "timeline" ? (
        <Button
          mode="contained-tonal"
          icon="timeline-plus"
          accessibilityLabel="Novo Evento ou Marco Cronológico"
          disabled={busy}
          onPress={() => {
            setForm({
              mode: "create",
              targetType: "timeline",
            });
          }}
        >
          Novo Evento / Cronologia
        </Button>
      ) : null}

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
        editable={canEditTarget(detail)}
        onEdit={(target) => {
          if (!canEditTarget(target) || !target) return;
          save.reset();
          setDetail(null);
          if (target.type === "encyclopedia") {
            setForm({
              mode: "edit",
              targetType: "encyclopedia",
              item: target.data,
            });
          } else if (target.type === "character") {
            setForm({
              mode: "edit",
              targetType: "character",
              item: target.data,
            });
          } else if (target.type === "timeline") {
            setForm({
              mode: "edit",
              targetType: "timeline",
              item: target.data,
            });
          }
        }}
        onDelete={(target) => {
          if (!canEditTarget(target) || !target) return;
          remove.reset();
          setDetail(null);
          if (target.type === "encyclopedia") {
            setDeleting({
              kind: "encyclopedia",
              item: target.data,
              label: target.data.name,
            });
          } else if (target.type === "character") {
            setDeleting({
              kind: "character",
              id: target.data.id,
              label: target.data.name,
            });
          } else if (target.type === "timeline") {
            setDeleting({
              kind: "timeline",
              id: target.data.id,
              label: target.data.title,
            });
          }
        }}
      />

      {detail?.type === "character" ? (
        <Portal>
          <View
            style={{
              position: "absolute",
              bottom: 24,
              alignSelf: "center",
              zIndex: 9999,
            }}
          >
            <Button
              mode="contained"
              icon="account-network"
              onPress={() => {
                const charId = detail.data.id;
                setDetail(null);
                setRelationsCharacterId(charId);
              }}
            >
              Gerenciar Organizações e Relacionamentos
            </Button>
          </View>
        </Portal>
      ) : null}

      <CreateEditModal
        formMode={form}
        visible={Boolean(form)}
        races={charactersWorkspace.races}
        organizations={charactersWorkspace.organizations}
        locations={timelineWorkspace.locations}
        chapters={snapshot.data.chapters}
        characters={charactersWorkspace.characters}
        onDismiss={() => setForm(null)}
        onSaveEncyclopedia={async (item, id) => {
          await save.mutateAsync({ item, id });
        }}
        onSaveCharacter={async (item, id) => {
          const saved = await charactersWorkspace.saveCharacter({
            characterId: id,
            payload: {
              name: item.name,
              raceId: item.raceId ?? null,
              role: item.role,
              age: item.age ?? null,
              height: item.height || null,
              weight: item.weight || null,
              zodiac: item.zodiac || null,
              bloodType: item.bloodType || null,
              mbti: item.mbti || null,
              likes: item.likes || null,
              dislikes: item.dislikes || null,
              drinks: item.drinks || null,
              characterImage: item.characterImage ?? null,
              imageFit: item.imageFit ?? "cover",
              imagePosition: item.imagePosition ?? "center",
              appearance: item.appearance || null,
              personality: item.personality || null,
              motivation: item.motivation || null,
              background: item.backstory || null,
              motto: item.quote || null,
            },
          });

          const selectedOrgIds = new Set(item.organizationIds ?? []);
          const existingLinks =
            charactersWorkspace.characterOrganizations.filter(
              (link) => link.characterId === saved.id,
            );
          for (const link of existingLinks) {
            if (!selectedOrgIds.has(link.organizationId)) {
              await charactersWorkspace.removeOrganizationLink(link.id);
            }
          }
          for (const orgId of selectedOrgIds) {
            const alreadyLinked = existingLinks.some(
              (link) => link.organizationId === orgId,
            );
            if (!alreadyLinked) {
              await charactersWorkspace.addOrganizationLink({
                characterId: saved.id,
                organizationId: orgId,
                isActive: true,
              });
            }
          }
        }}
        onSaveTimeline={async (item, id) => {
          await timelineWorkspace.saveEvent({
            eventId: id,
            payload: {
              title: item.title,
              description: item.description || item.summary || null,
              chronologicalDate: item.dateDisplay || null,
              sequenceOrder: item.dateOrder,
              chapterId: item.chapterId ?? null,
              locationId: item.locationId ?? null,
              eventImage: item.eventImage ?? null,
            },
            characterIds: item.characterIds ?? [],
          });
        }}
      />

      <CharacterRelationsModal
        visible={Boolean(activeRelationsCharacter)}
        character={activeRelationsCharacter}
        allCharacters={charactersWorkspace.characters}
        organizations={charactersWorkspace.organizations}
        characterOrganizations={charactersWorkspace.characterOrganizations}
        relationships={charactersWorkspace.relationships}
        busy={charactersWorkspace.isMutating}
        onDismiss={() => setRelationsCharacterId(null)}
        onAddOrganization={charactersWorkspace.addOrganizationLink}
        onUpdateOrganization={charactersWorkspace.updateOrganizationLink}
        onRemoveOrganization={charactersWorkspace.removeOrganizationLink}
        onSaveRelationship={charactersWorkspace.saveRelationship}
        onRemoveRelationship={charactersWorkspace.removeRelationship}
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
              Excluir {deleting?.label}? Esta ação será salva na sua conta e não
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
