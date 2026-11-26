import { UniverseImage } from "./UniverseImage";
import { useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Card, Chip, Surface, Text, useTheme } from "react-native-paper";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useUniverseStore, useUniverseStats } from "../universe-store";
import { ENCYCLOPEDIA_CATEGORIES } from "../constants";
import type { EncyclopediaCategory, EncyclopediaItem } from "../types";

interface EncyclopediaViewProps {
  onSelectItem: (item: EncyclopediaItem) => void;
}

export function EncyclopediaView({ onSelectItem }: EncyclopediaViewProps) {
  const theme = useTheme();
  const items = useUniverseStore((state) => state.encyclopediaItems);
  const selectedCategory = useUniverseStore((state) => state.selectedCategory);
  const setSelectedCategory = useUniverseStore(
    (state) => state.setSelectedCategory,
  );
  const searchQuery = useUniverseStore((state) => state.searchQuery);
  const stats = useUniverseStats();

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const inName = item.name.toLowerCase().includes(q);
      const inSub = item.subtitle.toLowerCase().includes(q);
      const inDesc = item.description.toLowerCase().includes(q);
      const inTags = item.tags.some((t) => t.toLowerCase().includes(q));
      const inAttrs = Object.values(item.attributes).some((v) =>
        v.toLowerCase().includes(q),
      );

      return inName || inSub || inDesc || inTags || inAttrs;
    });
  }, [items, selectedCategory, searchQuery]);

  return (
    <View style={styles.container}>
      {/* Category Pills Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsScroll}
      >
        <Chip
          selected={selectedCategory === "all"}
          onPress={() => setSelectedCategory("all")}
          style={styles.pill}
          icon="view-grid"
        >
          Todas ({stats.totalEncyclopedia})
        </Chip>
        {ENCYCLOPEDIA_CATEGORIES.map((cat) => {
          const count = stats.byCategory[cat.key] || 0;
          return (
            <Chip
              key={cat.key}
              selected={selectedCategory === cat.key}
              onPress={() =>
                setSelectedCategory(
                  selectedCategory === cat.key
                    ? "all"
                    : (cat.key as EncyclopediaCategory),
                )
              }
              style={styles.pill}
              icon={cat.icon}
            >
              {cat.label} ({count})
            </Chip>
          );
        })}
      </ScrollView>

      {/* List of items */}
      {filteredItems.length === 0 ? (
        <Surface style={styles.emptyContainer} elevation={0}>
          <MaterialCommunityIcons
            name="book-search-outline"
            size={48}
            color={theme.colors.secondary}
          />
          <Text variant="titleMedium" style={styles.emptyTitle}>
            Nenhuma entrada encontrada
          </Text>
          <Text variant="bodySmall" style={styles.emptySubtitle}>
            Tente mudar o filtro de categoria ou termos da busca, ou adicione um
            novo item à enciclopédia.
          </Text>
        </Surface>
      ) : (
        <View style={styles.list}>
          {filteredItems.map((item) => {
            const meta = ENCYCLOPEDIA_CATEGORIES.find(
              (c) => c.key === item.category,
            );
            const attrEntries = Object.entries(item.attributes || {}).slice(
              0,
              2,
            );

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() => onSelectItem(item)}
              >
                <Card
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outlineVariant ?? "#e0d8dd",
                    },
                  ]}
                  elevation={1}
                >
                  {item.image ? (
                    <UniverseImage uri={item.image} style={styles.cardCover} />
                  ) : null}
                  <Card.Content style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Surface
                        style={[
                          styles.categoryIconBadge,
                          { backgroundColor: meta?.color ?? "#704563" },
                        ]}
                        elevation={0}
                      >
                        <MaterialCommunityIcons
                          name={
                            (meta?.icon as never) ?? "book-open-page-variant"
                          }
                          size={20}
                          color="#ffffff"
                        />
                      </Surface>
                      <View style={styles.cardTitleBlock}>
                        <Text variant="titleMedium" style={styles.itemName}>
                          {item.name}
                        </Text>
                        <Text
                          variant="bodySmall"
                          numberOfLines={1}
                          style={styles.itemSubtitle}
                        >
                          {item.subtitle}
                        </Text>
                      </View>
                      <Chip
                        compact
                        style={[
                          styles.catBadge,
                          {
                            backgroundColor: (meta?.color ?? "#704563") + "20",
                          },
                        ]}
                        textStyle={{
                          color: meta?.color ?? "#704563",
                          fontWeight: "700",
                          fontSize: 11,
                        }}
                      >
                        {meta?.singular ?? item.category}
                      </Chip>
                    </View>

                    {(item.raceName ||
                      item.parentLocationName ||
                      item.headquartersLocationName ||
                      (item.category === "theme" && item.conceptCategory)) && (
                      <View style={styles.relationBadgeRow}>
                        {item.category === "creatures" && item.raceName ? (
                          <Chip compact icon="dna" style={styles.relationChip}>
                            Raça: {item.raceName}
                          </Chip>
                        ) : null}
                        {item.category === "locations" &&
                        item.parentLocationName ? (
                          <Chip
                            compact
                            icon="map-marker-radius"
                            style={styles.relationChip}
                          >
                            Pai: {item.parentLocationName}
                          </Chip>
                        ) : null}
                        {item.category === "organizations" &&
                        item.headquartersLocationName ? (
                          <Chip
                            compact
                            icon="office-building"
                            style={styles.relationChip}
                          >
                            Sede: {item.headquartersLocationName}
                          </Chip>
                        ) : null}
                        {(item.category === "theme" || item.conceptCategory) &&
                        item.conceptCategory ? (
                          <Chip
                            compact
                            icon="book-open-variant"
                            style={styles.relationChip}
                          >
                            {item.conceptCategory}
                          </Chip>
                        ) : null}
                      </View>
                    )}

                    <Text
                      variant="bodySmall"
                      numberOfLines={3}
                      style={styles.itemDesc}
                    >
                      {item.description}
                    </Text>

                    {attrEntries.length > 0 && (
                      <View style={styles.cardAttrs}>
                        {attrEntries.map(([k, v]) => (
                          <View key={k} style={styles.attrSnippet}>
                            <Text variant="labelSmall" style={styles.attrKey}>
                              {k}:
                            </Text>
                            <Text
                              variant="bodySmall"
                              numberOfLines={1}
                              style={styles.attrVal}
                            >
                              {v}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {item.tags && item.tags.length > 0 && (
                      <View style={styles.tagsRow}>
                        {item.tags.slice(0, 3).map((tag) => (
                          <Chip key={tag} compact style={styles.tagPill}>
                            #{tag}
                          </Chip>
                        ))}
                        {item.tags.length > 3 && (
                          <Text variant="labelSmall" style={styles.moreTags}>
                            +{item.tags.length - 3}
                          </Text>
                        )}
                      </View>
                    )}
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  pillsScroll: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  pill: {
    marginRight: 4,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    gap: 8,
    marginVertical: 16,
  },
  emptyTitle: {
    fontWeight: "bold",
    marginTop: 6,
  },
  emptySubtitle: {
    textAlign: "center",
    opacity: 0.7,
    maxWidth: 280,
  },
  list: {
    gap: 12,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
  },
  cardCover: {
    aspectRatio: 1,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  relationBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: 4,
  },
  relationChip: {
    height: 26,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  cardContent: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitleBlock: {
    flex: 1,
  },
  itemName: {
    fontWeight: "700",
  },
  itemSubtitle: {
    opacity: 0.75,
  },
  catBadge: {
    height: 26,
    borderRadius: 13,
  },
  itemDesc: {
    lineHeight: 18,
    opacity: 0.85,
  },
  cardAttrs: {
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    padding: 8,
    borderRadius: 8,
    gap: 4,
  },
  attrSnippet: {
    flexDirection: "row",
    gap: 6,
  },
  attrKey: {
    fontWeight: "700",
    opacity: 0.9,
  },
  attrVal: {
    flex: 1,
    opacity: 0.8,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  tagPill: {
    height: 24,
  },
  moreTags: {
    opacity: 0.6,
    marginLeft: 4,
  },
});
