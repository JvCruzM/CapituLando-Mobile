import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Chip,
  Dialog,
  Divider,
  Portal,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type {
  EncyclopediaItem,
  CharacterItem,
  TimelineEventItem,
} from "../types";
import {
  ENCYCLOPEDIA_CATEGORIES,
  CHARACTER_ROLES,
  TIMELINE_IMPORTANCE_COLORS,
} from "../constants";

type DetailTarget =
  | { type: "encyclopedia"; data: EncyclopediaItem }
  | { type: "character"; data: CharacterItem }
  | { type: "timeline"; data: TimelineEventItem }
  | null;

interface ItemDetailModalProps {
  editable?: boolean;
  target: DetailTarget;
  visible: boolean;
  onDismiss: () => void;
  onEdit: (target: DetailTarget) => void;
  onDelete: (target: DetailTarget) => void;
}

export function ItemDetailModal({
  editable = false,
  target,
  visible,
  onDismiss,
  onEdit,
  onDelete,
}: ItemDetailModalProps) {
  const theme = useTheme();

  if (!target) return null;

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onDismiss}
        style={[styles.dialog, { backgroundColor: theme.colors.surface }]}
      >
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {target.type === "encyclopedia" && (
              <EncyclopediaDetail item={target.data} />
            )}
            {target.type === "character" && (
              <CharacterDetail character={target.data} />
            )}
            {target.type === "timeline" && (
              <TimelineDetail event={target.data} />
            )}
          </ScrollView>
        </Dialog.ScrollArea>

        <Dialog.Actions style={styles.actions}>
          {editable ? (
            <>
              <Button
                textColor={theme.colors.error}
                onPress={() => onDelete(target)}
              >
                Excluir
              </Button>
              <Button
                mode="outlined"
                onPress={() => onEdit(target)}
                style={{ marginLeft: 8 }}
              >
                Editar
              </Button>
            </>
          ) : null}
          <Button
            mode="contained"
            onPress={onDismiss}
            style={{ marginLeft: 8 }}
          >
            Fechar
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function EncyclopediaDetail({ item }: { item: EncyclopediaItem }) {
  const meta = ENCYCLOPEDIA_CATEGORIES.find((c) => c.key === item.category);

  return (
    <View style={styles.detailContainer}>
      <View style={styles.headerRow}>
        <Surface
          style={[
            styles.iconBadge,
            { backgroundColor: meta?.color ?? "#704563" },
          ]}
          elevation={1}
        >
          <MaterialCommunityIcons
            name={(meta?.icon as never) ?? "book-open-page-variant"}
            size={24}
            color="#ffffff"
          />
        </Surface>
        <View style={styles.headerText}>
          <Text variant="titleLarge" style={styles.boldTitle}>
            {item.name}
          </Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            {item.subtitle}
          </Text>
        </View>
      </View>

      <Chip
        icon="tag"
        style={[styles.categoryChip, { alignSelf: "flex-start" }]}
      >
        {meta?.singular ?? item.category}
      </Chip>

      <Divider style={styles.divider} />

      <Text variant="titleSmall" style={styles.sectionHeader}>
        Descrição & Lore
      </Text>
      <Text variant="bodyMedium" style={styles.bodyParagraph}>
        {item.description}
      </Text>

      {item.attributes && Object.keys(item.attributes).length > 0 && (
        <>
          <Divider style={styles.divider} />
          <Text variant="titleSmall" style={styles.sectionHeader}>
            Atributos e Características
          </Text>
          <View style={styles.attributesList}>
            {Object.entries(item.attributes).map(([key, val]) => (
              <View key={key} style={styles.attributeRow}>
                <Text variant="labelMedium" style={styles.attrKey}>
                  {key}:
                </Text>
                <Text variant="bodySmall" style={styles.attrVal}>
                  {val}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {item.tags && item.tags.length > 0 && (
        <>
          <Divider style={styles.divider} />
          <Text variant="titleSmall" style={styles.sectionHeader}>
            Tags
          </Text>
          <View style={styles.chipsWrap}>
            {item.tags.map((tag) => (
              <Chip key={tag} compact style={styles.tagChip}>
                #{tag}
              </Chip>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function CharacterDetail({ character }: { character: CharacterItem }) {
  const roleMeta = CHARACTER_ROLES.find((r) => r.role === character.role);

  return (
    <View style={styles.detailContainer}>
      <View style={styles.headerRow}>
        <Surface
          style={[
            styles.iconBadge,
            { backgroundColor: roleMeta?.color ?? "#704563" },
          ]}
          elevation={1}
        >
          <MaterialCommunityIcons
            name={(roleMeta?.icon as never) ?? "account-star"}
            size={24}
            color="#ffffff"
          />
        </Surface>
        <View style={styles.headerText}>
          <Text variant="titleLarge" style={styles.boldTitle}>
            {character.name}
          </Text>
          {character.alias ? (
            <Text variant="bodySmall" style={styles.subtitle}>
              « {character.alias} »
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.chipsWrap}>
        <Chip
          icon="shield-account"
          style={{ backgroundColor: (roleMeta?.color ?? "#704563") + "22" }}
        >
          {character.role}
        </Chip>
        <Chip icon="dna">{character.race}</Chip>
        {character.organization ? (
          <Chip icon="bank">{character.organization}</Chip>
        ) : null}
      </View>

      {character.quote ? (
        <Surface style={styles.quoteBox} elevation={0}>
          <Text variant="bodyMedium" style={styles.quoteText}>
            “{character.quote}”
          </Text>
        </Surface>
      ) : null}

      <Divider style={styles.divider} />

      <Text variant="titleSmall" style={styles.sectionHeader}>
        Ocupação & Arquétipo
      </Text>
      <Text variant="bodyMedium">
        {character.occupation} — {character.archetype}
      </Text>

      <Divider style={styles.divider} />

      <Text variant="titleSmall" style={styles.sectionHeader}>
        Motivação Principal
      </Text>
      <Text variant="bodyMedium" style={styles.bodyParagraph}>
        {character.motivation}
      </Text>

      {character.internalConflict ? (
        <>
          <Text variant="titleSmall" style={styles.sectionHeader}>
            Conflito Interno / Medo
          </Text>
          <Text variant="bodyMedium" style={styles.bodyParagraph}>
            {character.internalConflict}
          </Text>
        </>
      ) : null}

      <Divider style={styles.divider} />

      <Text variant="titleSmall" style={styles.sectionHeader}>
        História de Origem (Backstory)
      </Text>
      <Text variant="bodyMedium" style={styles.bodyParagraph}>
        {character.backstory}
      </Text>

      <Divider style={styles.divider} />

      <Text variant="titleSmall" style={styles.sectionHeader}>
        Aparência & Personalidade
      </Text>
      <Text variant="bodySmall" style={styles.bodyParagraph}>
        <Text style={{ fontWeight: "bold" }}>Aparência: </Text>
        {character.appearance}
      </Text>
      <Text variant="bodySmall" style={styles.bodyParagraph}>
        <Text style={{ fontWeight: "bold" }}>Personalidade: </Text>
        {character.personality}
      </Text>

      {character.traits && character.traits.length > 0 && (
        <View style={styles.chipsWrap}>
          {character.traits.map((t) => (
            <Chip key={t} compact style={styles.tagChip}>
              {t}
            </Chip>
          ))}
        </View>
      )}
    </View>
  );
}

function TimelineDetail({ event }: { event: TimelineEventItem }) {
  const impColor = TIMELINE_IMPORTANCE_COLORS[event.importance] ?? "#704563";

  return (
    <View style={styles.detailContainer}>
      <View style={styles.headerRow}>
        <Surface
          style={[styles.iconBadge, { backgroundColor: impColor }]}
          elevation={1}
        >
          <MaterialCommunityIcons
            name="timeline-clock"
            size={24}
            color="#ffffff"
          />
        </Surface>
        <View style={styles.headerText}>
          <Text variant="titleLarge" style={styles.boldTitle}>
            {event.title}
          </Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            {event.era} • {event.dateDisplay}
          </Text>
        </View>
      </View>

      <View style={styles.chipsWrap}>
        <Chip
          icon="alert-decagram"
          style={{ backgroundColor: impColor + "22" }}
        >
          Impacto: {event.importance}
        </Chip>
        {event.location ? (
          <Chip icon="map-marker">{event.location}</Chip>
        ) : null}
      </View>

      <Divider style={styles.divider} />

      <Text variant="titleSmall" style={styles.sectionHeader}>
        Resumo do Evento
      </Text>
      <Text variant="bodyMedium" style={styles.bodyParagraph}>
        {event.summary}
      </Text>

      <Text variant="titleSmall" style={styles.sectionHeader}>
        Descrição Detalhada
      </Text>
      <Text variant="bodyMedium" style={styles.bodyParagraph}>
        {event.description}
      </Text>

      {event.consequences ? (
        <>
          <Divider style={styles.divider} />
          <Text variant="titleSmall" style={styles.sectionHeader}>
            Consequências para o Universo
          </Text>
          <Text variant="bodyMedium" style={styles.bodyParagraph}>
            {event.consequences}
          </Text>
        </>
      ) : null}

      {event.charactersInvolved && event.charactersInvolved.length > 0 && (
        <>
          <Divider style={styles.divider} />
          <Text variant="titleSmall" style={styles.sectionHeader}>
            Personagens Envolvidos
          </Text>
          <View style={styles.chipsWrap}>
            {event.charactersInvolved.map((charName) => (
              <Chip
                key={charName}
                icon="account"
                compact
                style={styles.tagChip}
              >
                {charName}
              </Chip>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dialog: {
    maxHeight: "88%",
    borderRadius: 16,
    marginHorizontal: 16,
  },
  scrollArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scrollContent: {
    paddingVertical: 8,
  },
  detailContainer: {
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
  },
  boldTitle: {
    fontWeight: "bold",
  },
  subtitle: {
    opacity: 0.75,
  },
  categoryChip: {
    marginTop: 4,
  },
  divider: {
    marginVertical: 4,
  },
  sectionHeader: {
    fontWeight: "700",
    marginTop: 4,
  },
  bodyParagraph: {
    lineHeight: 20,
    opacity: 0.9,
  },
  attributesList: {
    gap: 6,
    marginTop: 4,
  },
  attributeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  attrKey: {
    fontWeight: "700",
    color: "#704563",
  },
  attrVal: {
    flex: 1,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  tagChip: {
    marginRight: 4,
  },
  quoteBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(112, 69, 99, 0.08)",
    borderLeftWidth: 3,
    borderLeftColor: "#704563",
    marginVertical: 6,
  },
  quoteText: {
    fontStyle: "italic",
    opacity: 0.85,
  },
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});
