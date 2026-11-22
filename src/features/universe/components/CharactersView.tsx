import React, { useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Card, Chip, Surface, Text, useTheme } from "react-native-paper";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useUniverseStore, useUniverseStats } from "../universe-store";
import { CHARACTER_ROLES } from "../constants";
import type { CharacterItem, CharacterRole } from "../types";

interface CharactersViewProps {
  onSelectCharacter: (char: CharacterItem) => void;
}

export function CharactersView({ onSelectCharacter }: CharactersViewProps) {
  const theme = useTheme();
  const characters = useUniverseStore((state) => state.characters);
  const selectedRole = useUniverseStore((state) => state.selectedRole);
  const setSelectedRole = useUniverseStore((state) => state.setSelectedRole);
  const searchQuery = useUniverseStore((state) => state.searchQuery);
  const stats = useUniverseStats();

  const filteredCharacters = useMemo(() => {
    return characters.filter((c) => {
      const matchesRole = selectedRole === "all" || c.role === selectedRole;
      if (!matchesRole) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const inName = c.name.toLowerCase().includes(q);
      const inAlias = Boolean(c.alias?.toLowerCase().includes(q));
      const inRace = c.race.toLowerCase().includes(q);
      const inOrg = Boolean(c.organization?.toLowerCase().includes(q));
      const inArchetype = c.archetype.toLowerCase().includes(q);
      const inMotivation = c.motivation.toLowerCase().includes(q);
      const inBackstory = c.backstory.toLowerCase().includes(q);
      const inTraits = c.traits.some((t) => t.toLowerCase().includes(q));

      return (
        inName ||
        inAlias ||
        inRace ||
        inOrg ||
        inArchetype ||
        inMotivation ||
        inBackstory ||
        inTraits
      );
    });
  }, [characters, selectedRole, searchQuery]);

  return (
    <View style={styles.container}>
      {/* Role filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsScroll}
      >
        <Chip
          selected={selectedRole === "all"}
          onPress={() => setSelectedRole("all")}
          style={styles.pill}
          icon="account-group"
        >
          Todos ({stats.totalCharacters})
        </Chip>
        {CHARACTER_ROLES.map((r) => {
          const count = characters.filter((c) => c.role === r.role).length;
          return (
            <Chip
              key={r.role}
              selected={selectedRole === r.role}
              onPress={() =>
                setSelectedRole(
                  selectedRole === r.role ? "all" : (r.role as CharacterRole),
                )
              }
              style={styles.pill}
              icon={r.icon}
            >
              {r.role} ({count})
            </Chip>
          );
        })}
      </ScrollView>

      {/* Character Cards */}
      {filteredCharacters.length === 0 ? (
        <Surface style={styles.emptyContainer} elevation={0}>
          <MaterialCommunityIcons
            name="account-search-outline"
            size={48}
            color={theme.colors.secondary}
          />
          <Text variant="titleMedium" style={styles.emptyTitle}>
            Nenhum personagem encontrado
          </Text>
          <Text variant="bodySmall" style={styles.emptySubtitle}>
            Tente redefinir os filtros ou criar um novo personagem para
            enriquecer sua história.
          </Text>
        </Surface>
      ) : (
        <View style={styles.list}>
          {filteredCharacters.map((char) => {
            const roleMeta = CHARACTER_ROLES.find((r) => r.role === char.role);

            return (
              <TouchableOpacity
                key={char.id}
                activeOpacity={0.8}
                onPress={() => onSelectCharacter(char)}
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
                  <Card.Content style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Surface
                        style={[
                          styles.avatarBadge,
                          { backgroundColor: roleMeta?.color ?? "#704563" },
                        ]}
                        elevation={0}
                      >
                        <MaterialCommunityIcons
                          name={(roleMeta?.icon as never) ?? "account"}
                          size={22}
                          color="#ffffff"
                        />
                      </Surface>
                      <View style={styles.cardTitleBlock}>
                        <Text variant="titleMedium" style={styles.charName}>
                          {char.name}
                        </Text>
                        {char.alias ? (
                          <Text
                            variant="bodySmall"
                            numberOfLines={1}
                            style={styles.charAlias}
                          >
                            « {char.alias} »
                          </Text>
                        ) : (
                          <Text
                            variant="bodySmall"
                            numberOfLines={1}
                            style={styles.charAlias}
                          >
                            {char.occupation}
                          </Text>
                        )}
                      </View>
                      <Chip
                        compact
                        style={[
                          styles.roleBadge,
                          {
                            backgroundColor:
                              (roleMeta?.color ?? "#704563") + "20",
                          },
                        ]}
                        textStyle={{
                          color: roleMeta?.color ?? "#704563",
                          fontWeight: "700",
                          fontSize: 11,
                        }}
                      >
                        {char.role}
                      </Chip>
                    </View>

                    <View style={styles.metaChipsRow}>
                      <Chip icon="dna" compact style={styles.miniChip}>
                        {char.race}
                      </Chip>
                      {char.organization ? (
                        <Chip icon="shield" compact style={styles.miniChip}>
                          {char.organization}
                        </Chip>
                      ) : null}
                      <Chip icon="briefcase" compact style={styles.miniChip}>
                        {char.archetype}
                      </Chip>
                    </View>

                    {char.quote ? (
                      <View style={styles.quoteSnippet}>
                        <Text
                          variant="bodySmall"
                          numberOfLines={2}
                          style={styles.quoteText}
                        >
                          “{char.quote}”
                        </Text>
                      </View>
                    ) : (
                      <Text
                        variant="bodySmall"
                        numberOfLines={2}
                        style={styles.motivationText}
                      >
                        <Text style={{ fontWeight: "700" }}>Motivação: </Text>
                        {char.motivation}
                      </Text>
                    )}

                    {char.traits && char.traits.length > 0 && (
                      <View style={styles.traitsRow}>
                        {char.traits.map((trait) => (
                          <Chip key={trait} compact style={styles.traitPill}>
                            {trait}
                          </Chip>
                        ))}
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
  avatarBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitleBlock: {
    flex: 1,
  },
  charName: {
    fontWeight: "700",
  },
  charAlias: {
    opacity: 0.75,
  },
  roleBadge: {
    height: 26,
    borderRadius: 13,
  },
  metaChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  miniChip: {
    height: 26,
  },
  quoteSnippet: {
    backgroundColor: "rgba(112, 69, 99, 0.06)",
    borderLeftWidth: 3,
    borderLeftColor: "#704563",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  quoteText: {
    fontStyle: "italic",
    opacity: 0.85,
  },
  motivationText: {
    lineHeight: 18,
    opacity: 0.85,
  },
  traitsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  traitPill: {
    height: 24,
  },
});
