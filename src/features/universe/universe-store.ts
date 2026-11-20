import { create } from "zustand";
import { secureStore } from "../../shared/storage/secure-store";
import type {
  EncyclopediaCategory,
  EncyclopediaItem,
  CharacterItem,
  CharacterRole,
  TimelineEventItem,
  UniverseTab,
  UniverseStats,
} from "./types";
import {
  INITIAL_CHARACTERS,
  INITIAL_ENCYCLOPEDIA_ITEMS,
  INITIAL_TIMELINE_EVENTS,
} from "./universe-seed";

const STORAGE_KEY = "capitulando.universe.data";

interface PersistedUniverseData {
  encyclopediaItems: EncyclopediaItem[];
  characters: CharacterItem[];
  timelineEvents: TimelineEventItem[];
}

interface UniverseState {
  // State
  encyclopediaItems: EncyclopediaItem[];
  characters: CharacterItem[];
  timelineEvents: TimelineEventItem[];
  activeTab: UniverseTab;
  selectedCategory: EncyclopediaCategory | "all";
  selectedRole: CharacterRole | "all";
  selectedEra: string | "all";
  searchQuery: string;
  isLoaded: boolean;

  // Navigation & Filtering actions
  setActiveTab: (tab: UniverseTab) => void;
  setSelectedCategory: (cat: EncyclopediaCategory | "all") => void;
  setSelectedRole: (role: CharacterRole | "all") => void;
  setSelectedEra: (era: string | "all") => void;
  setSearchQuery: (query: string) => void;

  // CRUD Encyclopedia
  addEncyclopediaItem: (item: Omit<EncyclopediaItem, "id" | "createdAt" | "updatedAt">) => void;
  updateEncyclopediaItem: (id: string, updates: Partial<Omit<EncyclopediaItem, "id">>) => void;
  deleteEncyclopediaItem: (id: string) => void;

  // CRUD Characters
  addCharacter: (char: Omit<CharacterItem, "id" | "createdAt" | "updatedAt">) => void;
  updateCharacter: (id: string, updates: Partial<Omit<CharacterItem, "id">>) => void;
  deleteCharacter: (id: string) => void;

  // CRUD Timeline
  addTimelineEvent: (event: Omit<TimelineEventItem, "id" | "createdAt" | "updatedAt">) => void;
  updateTimelineEvent: (id: string, updates: Partial<Omit<TimelineEventItem, "id">>) => void;
  deleteTimelineEvent: (id: string) => void;

  // Lifecycle & Persistence
  loadData: () => Promise<void>;
  resetToDefaults: () => Promise<void>;

  // Computed helper
  getStats: () => UniverseStats;
}

export const useUniverseStore = create<UniverseState>((set, get) => ({
  encyclopediaItems: INITIAL_ENCYCLOPEDIA_ITEMS,
  characters: INITIAL_CHARACTERS,
  timelineEvents: INITIAL_TIMELINE_EVENTS,
  activeTab: "encyclopedia",
  selectedCategory: "all",
  selectedRole: "all",
  selectedEra: "all",
  searchQuery: "",
  isLoaded: false,

  setActiveTab: (activeTab) => set({ activeTab }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setSelectedRole: (selectedRole) => set({ selectedRole }),
  setSelectedEra: (selectedEra) => set({ selectedEra }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  loadData: async () => {
    try {
      const persisted = await secureStore.getSystemData<PersistedUniverseData>(STORAGE_KEY);
      if (
        persisted &&
        Array.isArray(persisted.encyclopediaItems) &&
        Array.isArray(persisted.characters) &&
        Array.isArray(persisted.timelineEvents)
      ) {
        set({
          encyclopediaItems: persisted.encyclopediaItems,
          characters: persisted.characters,
          timelineEvents: persisted.timelineEvents,
          isLoaded: true,
        });
        return;
      }
    } catch {
      // fallback to initial
    }
    set({
      encyclopediaItems: INITIAL_ENCYCLOPEDIA_ITEMS,
      characters: INITIAL_CHARACTERS,
      timelineEvents: INITIAL_TIMELINE_EVENTS,
      isLoaded: true,
    });
  },

  resetToDefaults: async () => {
    set({
      encyclopediaItems: INITIAL_ENCYCLOPEDIA_ITEMS,
      characters: INITIAL_CHARACTERS,
      timelineEvents: INITIAL_TIMELINE_EVENTS,
      selectedCategory: "all",
      selectedRole: "all",
      selectedEra: "all",
      searchQuery: "",
    });
    await secureStore.saveSystemData<PersistedUniverseData>(STORAGE_KEY, {
      encyclopediaItems: INITIAL_ENCYCLOPEDIA_ITEMS,
      characters: INITIAL_CHARACTERS,
      timelineEvents: INITIAL_TIMELINE_EVENTS,
    });
  },

  addEncyclopediaItem: (itemData) => {
    const now = new Date().toISOString();
    const newItem: EncyclopediaItem = {
      ...itemData,
      id: "enc-" + Date.now(),
      createdAt: now,
      updatedAt: now,
    };
    const nextList = [newItem, ...get().encyclopediaItems];
    set({ encyclopediaItems: nextList });
    void secureStore.saveSystemData<PersistedUniverseData>(STORAGE_KEY, {
      encyclopediaItems: nextList,
      characters: get().characters,
      timelineEvents: get().timelineEvents,
    });
  },

  updateEncyclopediaItem: (id, updates) => {
    const nextList = get().encyclopediaItems.map((item) =>
      item.id === id
        ? { ...item, ...updates, updatedAt: new Date().toISOString() }
        : item,
    );
    set({ encyclopediaItems: nextList });
    void secureStore.saveSystemData<PersistedUniverseData>(STORAGE_KEY, {
      encyclopediaItems: nextList,
      characters: get().characters,
      timelineEvents: get().timelineEvents,
    });
  },

  deleteEncyclopediaItem: (id) => {
    const nextList = get().encyclopediaItems.filter((item) => item.id !== id);
    set({ encyclopediaItems: nextList });
    void secureStore.saveSystemData<PersistedUniverseData>(STORAGE_KEY, {
      encyclopediaItems: nextList,
      characters: get().characters,
      timelineEvents: get().timelineEvents,
    });
  },

  addCharacter: (charData) => {
    const now = new Date().toISOString();
    const newChar: CharacterItem = {
      ...charData,
      id: "char-" + Date.now(),
      createdAt: now,
      updatedAt: now,
    };
    const nextList = [newChar, ...get().characters];
    set({ characters: nextList });
    void secureStore.saveSystemData<PersistedUniverseData>(STORAGE_KEY, {
      encyclopediaItems: get().encyclopediaItems,
      characters: nextList,
      timelineEvents: get().timelineEvents,
    });
  },

  updateCharacter: (id, updates) => {
    const nextList = get().characters.map((item) =>
      item.id === id
        ? { ...item, ...updates, updatedAt: new Date().toISOString() }
        : item,
    );
    set({ characters: nextList });
    void secureStore.saveSystemData<PersistedUniverseData>(STORAGE_KEY, {
      encyclopediaItems: get().encyclopediaItems,
      characters: nextList,
      timelineEvents: get().timelineEvents,
    });
  },

  deleteCharacter: (id) => {
    const nextList = get().characters.filter((item) => item.id !== id);
    set({ characters: nextList });
    void secureStore.saveSystemData<PersistedUniverseData>(STORAGE_KEY, {
      encyclopediaItems: get().encyclopediaItems,
      characters: nextList,
      timelineEvents: get().timelineEvents,
    });
  },

  addTimelineEvent: (eventData) => {
    const now = new Date().toISOString();
    const newEvent: TimelineEventItem = {
      ...eventData,
      id: "event-" + Date.now(),
      createdAt: now,
      updatedAt: now,
    };
    const nextList = [...get().timelineEvents, newEvent].sort(
      (a, b) => a.dateOrder - b.dateOrder,
    );
    set({ timelineEvents: nextList });
    void secureStore.saveSystemData<PersistedUniverseData>(STORAGE_KEY, {
      encyclopediaItems: get().encyclopediaItems,
      characters: get().characters,
      timelineEvents: nextList,
    });
  },

  updateTimelineEvent: (id, updates) => {
    const nextList = get()
      .timelineEvents.map((item) =>
        item.id === id
          ? { ...item, ...updates, updatedAt: new Date().toISOString() }
          : item,
      )
      .sort((a, b) => a.dateOrder - b.dateOrder);
    set({ timelineEvents: nextList });
    void secureStore.saveSystemData<PersistedUniverseData>(STORAGE_KEY, {
      encyclopediaItems: get().encyclopediaItems,
      characters: get().characters,
      timelineEvents: nextList,
    });
  },

  deleteTimelineEvent: (id) => {
    const nextList = get().timelineEvents.filter((item) => item.id !== id);
    set({ timelineEvents: nextList });
    void secureStore.saveSystemData<PersistedUniverseData>(STORAGE_KEY, {
      encyclopediaItems: get().encyclopediaItems,
      characters: get().characters,
      timelineEvents: nextList,
    });
  },

  getStats: () => {
    const { encyclopediaItems, characters, timelineEvents } = get();
    const byCategory: Record<EncyclopediaCategory, number> = {
      races: 0,
      creatures: 0,
      items: 0,
      locations: 0,
      organizations: 0,
      "world-rules": 0,
      theme: 0,
    };
    for (const item of encyclopediaItems) {
      if (byCategory[item.category] !== undefined) {
        byCategory[item.category]++;
      }
    }
    return {
      totalEncyclopedia: encyclopediaItems.length,
      totalCharacters: characters.length,
      totalTimeline: timelineEvents.length,
      byCategory,
    };
  },
}));
