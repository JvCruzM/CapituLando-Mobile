import { UniverseImage } from "./UniverseImage";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Chip,
  Dialog,
  Divider,
  Portal,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { Button } from "../../../shared/components/Controls";
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
      {item.image ? (
        <UniverseImage uri={item.image} style={styles.coverImage} />
      ) : null}

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

      <View style={styles.chipsWrap}>
        <Chip
          icon="tag"
          style={[
            styles.categoryChip,
            { backgroundColor: (meta?.color ?? "#704563") + "22" },
          ]}
        >
          {meta?.singular ?? item.category}
        </Chip>
        {item.category === "creatures" && (
          <Chip icon="dna" style={{ backgroundColor: "#8e44ad22" }}>
            Raça: {item.raceName || "Sem raça vinculada"}
          </Chip>
        )}
        {item.category === "locations" && (
          <Chip
            icon="map-marker-radius"
            style={{ backgroundColor: "#2980b922" }}
          >
            Local Pai: {item.parentLocationName || "Local Principal"}
          </Chip>
        )}
        {item.category === "organizations" && (
          <Chip icon="office-building" style={{ backgroundColor: "#16a08522" }}>
            Sede: {item.headquartersLocationName || "Sem sede definida"}
          </Chip>
        )}
        {(item.category === "theme" || item.conceptCategory) && (
          <Chip
            icon="book-open-variant"
            style={{ backgroundColor: "#70456322" }}
          >
            {item.conceptCategory || "Lore/História"}
          </Chip>
        )}
      </View>

      <Divider style={styles.divider} />

      <Text variant="titleSmall" style={styles.sectionHeader}>
        Descrição & Lore
      </Text>
      <Text variant="bodyMedium" style={styles.bodyParagraph}>
        {item.description}
      </Text>

      <Divider style={styles.divider} />
      <Text variant="titleSmall" style={styles.sectionHeader}>
        Atributos e Características
      </Text>
      <View style={styles.attributesList}>
        {item.category === "creatures" && (
          <View style={styles.attributeRow}>
            <Text variant="labelMedium" style={styles.attrKey}>
              Raça da Criatura:
            </Text>
            <Text variant="bodySmall" style={styles.attrVal}>
              {item.raceName || "Sem raça vinculada"}
            </Text>
          </View>
        )}
        {item.category === "locations" && (
          <View style={styles.attributeRow}>
            <Text variant="labelMedium" style={styles.attrKey}>
              Local Pai:
            </Text>
            <Text variant="bodySmall" style={styles.attrVal}>
              {item.parentLocationName || "Nenhum (Local Principal)"}
            </Text>
          </View>
        )}
        {item.category === "organizations" && (
          <View style={styles.attributeRow}>
            <Text variant="labelMedium" style={styles.attrKey}>
              Sede / Quartel-General:
            </Text>
            <Text variant="bodySmall" style={styles.attrVal}>
              {item.headquartersLocationName || "Sem sede definida"}
            </Text>
          </View>
        )}
        {item.attributes &&
          Object.entries(item.attributes).map(([key, val]) => (
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
  const bioFacts = [
    character.age !== null && character.age !== undefined
      ? `Idade: ${character.age}`
      : null,
    character.height ? `Altura: ${character.height}` : null,
    character.weight ? `Peso: ${character.weight}` : null,
    character.zodiac ? `Signo: ${character.zodiac}` : null,
    character.bloodType ? `Tipo sanguíneo: ${character.bloodType}` : null,
    character.mbti ? `MBTI: ${character.mbti}` : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <View style={styles.detailContainer}>
      {character.characterImage ? (
        <UniverseImage
          uri={character.characterImage}
          fit={character.imageFit}
          position={character.imagePosition}
          style={styles.coverImage}
        />
      ) : null}

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

      {bioFacts.length > 0 ? (
        <View style={styles.chipsWrap}>
          {bioFacts.map((fact) => (
            <Chip key={fact} compact style={styles.tagChip}>
              {fact}
            </Chip>
          ))}
        </View>
      ) : null}

      {character.quote ? (
        <Surface style={styles.quoteBox} elevation={0}>
          <Text variant="bodyMedium" style={styles.quoteText}>
            “{character.quote}”
          </Text>
        </Surface>
      ) : null}

      {character.occupation || character.archetype ? (
        <>
          <Divider style={styles.divider} />
          <Text variant="titleSmall" style={styles.sectionHeader}>
            Ocupação & Arquétipo
          </Text>
          <Text variant="bodyMedium">
            {[character.occupation, character.archetype]
              .filter(Boolean)
              .join(" — ")}
          </Text>
        </>
      ) : null}

      <Divider style={styles.divider} />

      <Text variant="titleSmall" style={styles.sectionHeader}>
        Motivação Principal
      </Text>
      <Text variant="bodyMedium" style={styles.bodyParagraph}>
        {character.motivation || "Não informada."}
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
        {character.backstory || "Em desenvolvimento."}
      </Text>
      {character.notes ? (
        <>
          <Text variant="titleSmall" style={styles.sectionHeader}>
            Notas
          </Text>
          <Text variant="bodyMedium" style={styles.bodyParagraph}>
            {character.notes}
          </Text>
        </>
      ) : null}

      <Divider style={styles.divider} />

      <Text variant="titleSmall" style={styles.sectionHeader}>
        Aparência & Personalidade
      </Text>
      <Text variant="bodySmall" style={styles.bodyParagraph}>
        <Text style={{ fontWeight: "bold" }}>Aparência: </Text>
        {character.appearance || "Não especificada."}
      </Text>
      <Text variant="bodySmall" style={styles.bodyParagraph}>
        <Text style={{ fontWeight: "bold" }}>Personalidade: </Text>
        {character.personality || "Não especificada."}
      </Text>

      {character.likes || character.dislikes || character.drinks ? (
        <>
          <Divider style={styles.divider} />
          <Text variant="titleSmall" style={styles.sectionHeader}>
            Preferências & Hábitos
          </Text>
          {character.likes ? (
            <Text variant="bodySmall" style={styles.bodyParagraph}>
              <Text style={{ fontWeight: "bold" }}>Gostos: </Text>
              {character.likes}
            </Text>
          ) : null}
          {character.dislikes ? (
            <Text variant="bodySmall" style={styles.bodyParagraph}>
              <Text style={{ fontWeight: "bold" }}>Desgostos: </Text>
              {character.dislikes}
            </Text>
          ) : null}
          {character.drinks ? (
            <Text variant="bodySmall" style={styles.bodyParagraph}>
              <Text style={{ fontWeight: "bold" }}>Bebidas: </Text>
              {character.drinks}
            </Text>
          ) : null}
        </>
      ) : null}

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
      {event.eventImage ? (
        <UniverseImage uri={event.eventImage} style={styles.coverImage} />
      ) : null}

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
            {[event.era, event.dateDisplay].filter(Boolean).join(" • ")}
          </Text>
        </View>
      </View>

      <View style={styles.chipsWrap}>
        {event.chapterTitle ? (
          <Chip icon="book-open-variant">{event.chapterTitle}</Chip>
        ) : null}
        {event.location ? (
          <Chip icon="map-marker">{event.location}</Chip>
        ) : null}
      </View>

      <Divider style={styles.divider} />

      <Text variant="titleSmall" style={styles.sectionHeader}>
        Descrição do Evento
      </Text>
      <Text variant="bodyMedium" style={styles.bodyParagraph}>
        {event.description || event.summary}
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
            {event.charactersInvolved.map((charName, index) => (
              <Chip
                key={`${charName}-${index}`}
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
  coverImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
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
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});
