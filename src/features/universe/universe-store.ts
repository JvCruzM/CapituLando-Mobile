import { useMemo } from "react";
import { create } from "zustand";
import { useAuthStore } from "../auth/session";
import type {
  EncyclopediaCategory,
  CharacterRole,
  UniverseTab,
  UniverseStats,
} from "./types";
import type { UniverseData } from "./services/universe-api";

const emptyData = (): UniverseData => ({
  encyclopediaItems: [],
  characters: [],
  timelineEvents: [],
});
interface UniverseState extends UniverseData {
  snapshotKey: string;
  activeTab: UniverseTab;
  selectedCategory: EncyclopediaCategory | "all";
  selectedRole: CharacterRole | "all";
  selectedEra: string;
  searchQuery: string;
  setActiveTab: (value: UniverseTab) => void;
  setSelectedCategory: (value: EncyclopediaCategory | "all") => void;
  setSelectedRole: (value: CharacterRole | "all") => void;
  setSelectedEra: (value: string) => void;
  setSearchQuery: (value: string) => void;
  setSnapshot: (key: string, data: UniverseData) => void;
  reset: () => void;
}
export const useUniverseStore = create<UniverseState>((set) => ({
  ...emptyData(),
  snapshotKey: "",
  activeTab: "encyclopedia",
  selectedCategory: "all",
  selectedRole: "all",
  selectedEra: "all",
  searchQuery: "",
  setActiveTab: (activeTab) => set({ activeTab }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setSelectedRole: (selectedRole) => set({ selectedRole }),
  setSelectedEra: (selectedEra) => set({ selectedEra }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSnapshot: (snapshotKey, data) => set({ ...data, snapshotKey }),
  reset: () =>
    set({
      ...emptyData(),
      snapshotKey: "",
      activeTab: "encyclopedia",
      selectedCategory: "all",
      selectedRole: "all",
      selectedEra: "all",
      searchQuery: "",
    }),
}));

useAuthStore.subscribe((state, previous) => {
  if (state.session?.user.id !== previous.session?.user.id)
    useUniverseStore.getState().reset();
});

export function useUniverseStats(): UniverseStats {
  const items = useUniverseStore((state) => state.encyclopediaItems);
  const characters = useUniverseStore((state) => state.characters);
  const events = useUniverseStore((state) => state.timelineEvents);
  return useMemo(() => {
    const byCategory: UniverseStats["byCategory"] = {
      races: 0,
      creatures: 0,
      items: 0,
      locations: 0,
      organizations: 0,
      "world-rules": 0,
      theme: 0,
    };
    for (const item of items) byCategory[item.category]++;
    return {
      totalEncyclopedia: items.length,
      totalCharacters: characters.length,
      totalTimeline: events.length,
      byCategory,
    };
  }, [items, characters, events]);
}
