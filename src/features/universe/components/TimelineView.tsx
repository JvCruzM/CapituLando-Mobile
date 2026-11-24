import React, { useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import {
  Card,
  Chip,
  Surface,
  Text,
  SegmentedButtons,
  useTheme,
} from "react-native-paper";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useUniverseStore, useUniverseStats } from "../universe-store";
import { TIMELINE_IMPORTANCE_COLORS } from "../constants";
import type { TimelineEventItem } from "../types";

interface TimelineViewProps {
  mode: "free" | "linked";
  onModeChange: (mode: "free" | "linked") => void;
  onSelectEvent: (event: TimelineEventItem) => void;
}

export function TimelineView({
  onSelectEvent,
  mode,
  onModeChange,
}: TimelineViewProps) {
  const theme = useTheme();
  const events = useUniverseStore((state) => state.timelineEvents);
  const selectedEra = useUniverseStore((state) => state.selectedEra);
  const setSelectedEra = useUniverseStore((state) => state.setSelectedEra);
  const searchQuery = useUniverseStore((state) => state.searchQuery);
  const stats = useUniverseStats();

  // Distinct Eras list
  const eras = useMemo(() => {
    const set = new Set<string>();
    for (const ev of events) {
      if (ev.era && ev.id.startsWith("chronology:") === (mode === "free"))
        set.add(ev.era);
    }
    return Array.from(set);
  }, [events, mode]);

  const filteredEvents = useMemo(() => {
    return events
      .filter((ev) => {
        if (ev.id.startsWith("chronology:") !== (mode === "free")) return false;
        const matchesEra = selectedEra === "all" || ev.era === selectedEra;
        if (!matchesEra) return false;

        if (!searchQuery.trim()) return true;

        const q = searchQuery.toLowerCase().trim();
        const inTitle = ev.title.toLowerCase().includes(q);
        const inEra = ev.era.toLowerCase().includes(q);
        const inDate = ev.dateDisplay.toLowerCase().includes(q);
        const inSum = ev.summary.toLowerCase().includes(q);
        const inDesc = ev.description.toLowerCase().includes(q);
        const inLoc = Boolean(ev.location?.toLowerCase().includes(q));
        const inChars = ev.charactersInvolved.some((c) =>
          c.toLowerCase().includes(q),
        );
        const inCons = Boolean(ev.consequences?.toLowerCase().includes(q));

        return (
          inTitle ||
          inEra ||
          inDate ||
          inSum ||
          inDesc ||
          inLoc ||
          inChars ||
          inCons
        );
      })
      .sort((a, b) => a.dateOrder - b.dateOrder);
  }, [events, selectedEra, searchQuery, mode]);

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={mode}
        onValueChange={(v) => {
          setSelectedEra("all");
          onModeChange(v as "free" | "linked");
        }}
        buttons={[
          { value: "free", label: "Cronologia livre" },
          { value: "linked", label: "Eventos" },
        ]}
      />
      {/* Era filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsScroll}
      >
        <Chip
          selected={selectedEra === "all"}
          onPress={() => setSelectedEra("all")}
          style={styles.pill}
          icon="timeline-text"
        >
          Todos os períodos
        </Chip>
        {eras.map((era) => {
          const count = events.filter((e) => e.era === era).length;
          return (
            <Chip
              key={era}
              selected={selectedEra === era}
              onPress={() => setSelectedEra(selectedEra === era ? "all" : era)}
              style={styles.pill}
              icon="calendar"
            >
              {era} ({count})
            </Chip>
          );
        })}
      </ScrollView>

      {/* Timeline track and cards */}
      {filteredEvents.length === 0 ? (
        <Surface style={styles.emptyContainer} elevation={0}>
          <MaterialCommunityIcons
            name="timeline-clock-outline"
            size={48}
            color={theme.colors.secondary}
          />
          <Text variant="titleMedium" style={styles.emptyTitle}>
            Nenhum evento cronológico encontrado
          </Text>
          <Text variant="bodySmall" style={styles.emptySubtitle}>
            Ajuste os filtros de busca ou adicione marcos históricos para criar
            a linha do tempo do seu mundo.
          </Text>
        </Surface>
      ) : (
        <View style={styles.timelineList}>
          {filteredEvents.map((event, index) => {
            const impColor =
              TIMELINE_IMPORTANCE_COLORS[event.importance] ?? "#704563";
            const isLast = index === filteredEvents.length - 1;

            return (
              <View key={event.id} style={styles.timelineRow}>
                {/* Visual vertical track with node dot */}
                <View style={styles.trackColumn}>
                  <Surface
                    style={[styles.nodeDot, { backgroundColor: impColor }]}
                    elevation={2}
                  >
                    <MaterialCommunityIcons
                      name={
                        event.importance === "Crucial"
                          ? "alert-decagram"
                          : "circle-small"
                      }
                      size={event.importance === "Crucial" ? 14 : 18}
                      color="#ffffff"
                    />
                  </Surface>
                  {!isLast && (
                    <View
                      style={[
                        styles.trackLine,
                        {
                          backgroundColor:
                            theme.colors.outlineVariant ?? "#ddd",
                        },
                      ]}
                    />
                  )}
                </View>

                {/* Event Card */}
                <View style={styles.cardWrapper}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => onSelectEvent(event)}
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
                        <View style={styles.cardTopRow}>
                          <Chip
                            icon="calendar-clock"
                            compact
                            style={styles.dateBadge}
                          >
                            {event.dateDisplay}
                          </Chip>
                        </View>

                        <Text variant="titleMedium" style={styles.eventTitle}>
                          {event.title}
                        </Text>
                        <Text variant="labelSmall" style={styles.eraText}>
                          {event.era}
                        </Text>

                        <Text
                          variant="bodySmall"
                          numberOfLines={3}
                          style={styles.summaryText}
                        >
                          {event.summary}
                        </Text>

                        <View style={styles.bottomMeta}>
                          {event.location ? (
                            <Chip
                              icon="map-marker"
                              compact
                              style={styles.metaChip}
                            >
                              {event.location}
                            </Chip>
                          ) : null}
                          {event.charactersInvolved &&
                            event.charactersInvolved.map((charName) => (
                              <Chip
                                key={charName}
                                icon="account-outline"
                                compact
                                style={styles.metaChip}
                              >
                                {charName}
                              </Chip>
                            ))}
                        </View>
                      </Card.Content>
                    </Card>
                  </TouchableOpacity>
                </View>
              </View>
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
  timelineList: {
    paddingLeft: 4,
  },
  timelineRow: {
    flexDirection: "row",
    position: "relative",
  },
  trackColumn: {
    width: 32,
    alignItems: "center",
  },
  nodeDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
    zIndex: 2,
  },
  trackLine: {
    position: "absolute",
    top: 38,
    bottom: -10,
    width: 2,
    zIndex: 1,
  },
  cardWrapper: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 16,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
  },
  cardContent: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  dateBadge: {
    height: 26,
  },
  importanceBadge: {
    height: 26,
    borderRadius: 13,
  },
  eventTitle: {
    fontWeight: "700",
  },
  eraText: {
    opacity: 0.7,
    fontStyle: "italic",
    marginTop: -2,
  },
  summaryText: {
    lineHeight: 18,
    opacity: 0.85,
    marginTop: 2,
  },
  bottomMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  metaChip: {
    height: 26,
  },
});
