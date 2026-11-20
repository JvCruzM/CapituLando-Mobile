import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Chip,
  Dialog,
  FAB,
  IconButton,
  Menu,
  Portal,
  Searchbar,
  SegmentedButtons,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Screen } from "../../../shared/components/Screen";
import { useUniverseStore } from "../universe-store";
import { EncyclopediaView } from "../components/EncyclopediaView";
import { CharactersView } from "../components/CharactersView";
import { TimelineView } from "../components/TimelineView";
import { ItemDetailModal } from "../components/ItemDetailModal";
import { CreateEditModal, type FormMode } from "../components/CreateEditModal";
import type {
  EncyclopediaCategory,
  EncyclopediaItem,
  CharacterItem,
  TimelineEventItem,
  UniverseTab,
} from "../types";

export function UniverseScreen() {
  const theme = useTheme();

  // Zustand Store
  const loadData = useUniverseStore((state) => state.loadData);
  const activeTab = useUniverseStore((state) => state.activeTab);
  const setActiveTab = useUniverseStore((state) => state.setActiveTab);
  const selectedCategory = useUniverseStore((state) => state.selectedCategory);
  const searchQuery = useUniverseStore((state) => state.searchQuery);
  const setSearchQuery = useUniverseStore((state) => state.setSearchQuery);
  const stats = useUniverseStore((state) => state.getStats());

  // CRUD actions
  const addEncyclopediaItem = useUniverseStore(
    (state) => state.addEncyclopediaItem,
  );
  const updateEncyclopediaItem = useUniverseStore(
    (state) => state.updateEncyclopediaItem,
  );
  const deleteEncyclopediaItem = useUniverseStore(
    (state) => state.deleteEncyclopediaItem,
  );

  const addCharacter = useUniverseStore((state) => state.addCharacter);
  const updateCharacter = useUniverseStore((state) => state.updateCharacter);
  const deleteCharacter = useUniverseStore((state) => state.deleteCharacter);

  const addTimelineEvent = useUniverseStore((state) => state.addTimelineEvent);
  const updateTimelineEvent = useUniverseStore(
    (state) => state.updateTimelineEvent,
  );
  const deleteTimelineEvent = useUniverseStore(
    (state) => state.deleteTimelineEvent,
  );
  const resetToDefaults = useUniverseStore((state) => state.resetToDefaults);

  // Modals & Menu State
  const [detailTarget, setDetailTarget] = useState<
    | { type: "encyclopedia"; data: EncyclopediaItem }
    | { type: "character"; data: CharacterItem }
    | { type: "timeline"; data: TimelineEventItem }
    | null
  >(null);

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [resetConfirmVisible, setResetConfirmVisible] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<
    | { type: "encyclopedia"; data: EncyclopediaItem }
    | { type: "character"; data: CharacterItem }
    | { type: "timeline"; data: TimelineEventItem }
    | null
  >(null);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Handlers for Add Button
  function handleOpenCreate() {
    if (activeTab === "encyclopedia") {
      const cat =
        selectedCategory === "all"
          ? ("races" as EncyclopediaCategory)
          : selectedCategory;
      setFormMode({
        mode: "create",
        targetType: "encyclopedia",
        defaultCategory: cat,
      });
    } else if (activeTab === "characters") {
      setFormMode({ mode: "create", targetType: "character" });
    } else {
      setFormMode({ mode: "create", targetType: "timeline" });
    }
  }

  function handleEditFromDetail(
    target:
      | { type: "encyclopedia"; data: EncyclopediaItem }
      | { type: "character"; data: CharacterItem }
      | { type: "timeline"; data: TimelineEventItem }
      | null,
  ) {
    setDetailTarget(null);
    if (!target) return;
    if (target.type === "encyclopedia") {
      setFormMode({
        mode: "edit",
        targetType: "encyclopedia",
        item: target.data,
      });
    } else if (target.type === "character") {
      setFormMode({
        mode: "edit",
        targetType: "character",
        item: target.data,
      });
    } else if (target.type === "timeline") {
      setFormMode({
        mode: "edit",
        targetType: "timeline",
        item: target.data,
      });
    }
  }

  function handleDeleteFromDetail(
    target:
      | { type: "encyclopedia"; data: EncyclopediaItem }
      | { type: "character"; data: CharacterItem }
      | { type: "timeline"; data: TimelineEventItem }
      | null,
  ) {
    if (!target) return;
    setDetailTarget(null);
    setDeleteConfirmTarget(target);
  }

  function handleConfirmDelete() {
    if (!deleteConfirmTarget) return;
    if (deleteConfirmTarget.type === "encyclopedia") {
      deleteEncyclopediaItem(deleteConfirmTarget.data.id);
    } else if (deleteConfirmTarget.type === "character") {
      deleteCharacter(deleteConfirmTarget.data.id);
    } else if (deleteConfirmTarget.type === "timeline") {
      deleteTimelineEvent(deleteConfirmTarget.data.id);
    }
    setDeleteConfirmTarget(null);
  }

  return (
    <Screen>
      {/* Top Banner & Header */}
      <Surface
        style={[
          styles.headerBanner,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant ?? "#e0d8dd",
          },
        ]}
        elevation={1}
      >
        <View style={styles.bannerRow}>
          <View style={styles.bannerText}>
            <Text variant="headlineSmall" style={styles.mainTitle}>
              Bíblia do Universo
            </Text>
            <Text variant="bodySmall" style={styles.bannerSubtitle}>
              Enciclopédia de Lore, Personagens e Linha do Tempo
            </Text>
          </View>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton
                icon="dots-vertical"
                onPress={() => setMenuVisible(true)}
                accessibilityLabel="Opções do Universo"
              />
            }
          >
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                setResetConfirmVisible(true);
              }}
              title="Restaurar Lore Inicial"
              leadingIcon="backup-restore"
            />
          </Menu>
        </View>

        {/* Live Counters */}
        <View style={styles.statsRow}>
          <Chip icon="book-open-variant" compact style={styles.statChip}>
            {stats.totalEncyclopedia} Entradas
          </Chip>
          <Chip icon="account-group" compact style={styles.statChip}>
            {stats.totalCharacters} Personagens
          </Chip>
          <Chip icon="timeline-clock" compact style={styles.statChip}>
            {stats.totalTimeline} Eventos
          </Chip>
        </View>
      </Surface>

      {/* Main Tab Segmented Buttons */}
      <SegmentedButtons
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as UniverseTab)}
        buttons={[
          {
            value: "encyclopedia",
            label: "Enciclopédia",
            icon: "book-open-page-variant",
          },
          {
            value: "characters",
            label: "Personagens",
            icon: "account-star",
          },
          {
            value: "timeline",
            label: "Cronologia",
            icon: "timeline-clock",
          },
        ]}
      />

      {/* Universal Searchbar */}
      <Searchbar
        placeholder={
          activeTab === "encyclopedia"
            ? "Buscar raças, criaturas, itens, regras..."
            : activeTab === "characters"
            ? "Buscar personagens por nome, arquétipo, papel..."
            : "Buscar eventos, eras, personagens..."
        }
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={[
          styles.searchBar,
          { backgroundColor: theme.colors.surface },
        ]}
      />

      {/* Action Bar (Add & Context info) */}
      <View style={styles.actionBar}>
        <Text variant="labelLarge" style={styles.actionSectionTitle}>
          {activeTab === "encyclopedia"
            ? "Códice & Entradas do Mundo"
            : activeTab === "characters"
            ? "Galeria de Personagens"
            : "Linha Cronológica de Eventos"}
        </Text>
        <Button
          mode="contained-tonal"
          icon="plus"
          compact
          onPress={handleOpenCreate}
        >
          {activeTab === "encyclopedia"
            ? "Nova Entrada"
            : activeTab === "characters"
            ? "Novo Personagem"
            : "Novo Evento"}
        </Button>
      </View>

      {/* Tab Content Views */}
      {activeTab === "encyclopedia" && (
        <EncyclopediaView
          onSelectItem={(item) =>
            setDetailTarget({ type: "encyclopedia", data: item })
          }
        />
      )}

      {activeTab === "characters" && (
        <CharactersView
          onSelectCharacter={(char) =>
            setDetailTarget({ type: "character", data: char })
          }
        />
      )}

      {activeTab === "timeline" && (
        <TimelineView
          onSelectEvent={(ev) =>
            setDetailTarget({ type: "timeline", data: ev })
          }
        />
      )}

      {/* Detail Inspection Modal */}
      <ItemDetailModal
        target={detailTarget}
        visible={Boolean(detailTarget)}
        onDismiss={() => setDetailTarget(null)}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteFromDetail}
      />

      {/* Create / Edit Form Modal */}
      <CreateEditModal
        formMode={formMode}
        visible={Boolean(formMode)}
        onDismiss={() => setFormMode(null)}
        onSaveEncyclopedia={(itemData, id) => {
          if (id) {
            updateEncyclopediaItem(id, itemData);
          } else {
            addEncyclopediaItem(itemData);
          }
        }}
        onSaveCharacter={(charData, id) => {
          if (id) {
            updateCharacter(id, charData);
          } else {
            addCharacter(charData);
          }
        }}
        onSaveTimeline={(timeData, id) => {
          if (id) {
            updateTimelineEvent(id, timeData);
          } else {
            addTimelineEvent(timeData);
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={Boolean(deleteConfirmTarget)}
          onDismiss={() => setDeleteConfirmTarget(null)}
        >
          <Dialog.Title>Excluir Registro?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Tem certeza que deseja excluir{" "}
              <Text style={{ fontWeight: "bold" }}>
                {deleteConfirmTarget?.type === "encyclopedia"
                  ? deleteConfirmTarget.data.name
                  : deleteConfirmTarget?.type === "character"
                  ? deleteConfirmTarget.data.name
                  : deleteConfirmTarget?.type === "timeline"
                  ? deleteConfirmTarget.data.title
                  : ""}
              </Text>
              ? Esta ação não pode ser desfeita.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteConfirmTarget(null)}>
              Cancelar
            </Button>
            <Button
              textColor={theme.colors.error}
              onPress={handleConfirmDelete}
            >
              Confirmar Exclusão
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Reset Defaults Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={resetConfirmVisible}
          onDismiss={() => setResetConfirmVisible(false)}
        >
          <Dialog.Title>Restaurar Lore Inicial?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Isso restaurará todos os dados de exemplo do universo (raças,
              criaturas, itens, locais, organizações, regras, tema, personagens
              e cronologia). Suas edições personalizadas serão substituídas.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setResetConfirmVisible(false)}>
              Cancelar
            </Button>
            <Button
              onPress={async () => {
                await resetToDefaults();
                setResetConfirmVisible(false);
              }}
            >
              Restaurar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBanner: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  bannerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bannerText: {
    flex: 1,
  },
  mainTitle: {
    fontWeight: "bold",
    color: "#704563",
  },
  bannerSubtitle: {
    opacity: 0.75,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statChip: {
    height: 28,
  },
  searchBar: {
    borderRadius: 12,
    elevation: 1,
  },
  actionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  actionSectionTitle: {
    fontWeight: "700",
  },
});
