export type EncyclopediaCategory =
  | "races"
  | "creatures"
  | "items"
  | "locations"
  | "organizations"
  | "world-rules"
  | "theme";

export interface EncyclopediaItem {
  editable?: boolean;
  source?: Record<string, unknown>;
  id: string;
  category: EncyclopediaCategory;
  name: string;
  subtitle: string;
  description: string;
  attributes: Record<string, string>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type CharacterRole =
  | "Protagonista"
  | "Antagonista"
  | "Mentor"
  | "Aliado"
  | "Secundário";

export interface CharacterItem {
  notes?: string;
  id: string;
  name: string;
  alias?: string;
  role: CharacterRole;
  race: string;
  organization?: string;
  occupation: string;
  archetype: string;
  appearance: string;
  personality: string;
  motivation: string;
  internalConflict: string;
  backstory: string;
  traits: string[];
  quote?: string;
  createdAt: string;
  updatedAt: string;
}

export type TimelineImportance = "Crucial" | "Maior" | "Menor";

export interface TimelineEventItem {
  id: string;
  title: string;
  era: string;
  dateOrder: number;
  dateDisplay: string;
  importance: TimelineImportance;
  summary: string;
  description: string;
  location?: string;
  charactersInvolved: string[];
  consequences?: string;
  createdAt: string;
  updatedAt: string;
}

export type UniverseTab = "encyclopedia" | "characters" | "timeline";

export interface UniverseStats {
  totalEncyclopedia: number;
  totalCharacters: number;
  totalTimeline: number;
  byCategory: Record<EncyclopediaCategory, number>;
}

export type WritingItemKind = "chapter" | "draft";

export interface WritingEntry {
  id: string;
  storyId: string;
  title: string;
  content: string;
  kind: WritingItemKind;
  wordCount: number;
  version: number;
  updatedAt: string;
}

export interface WritingRecoveryState {
  storyId: string;
  itemId: string | null;
  kind: WritingItemKind;
  title: string;
  content: string;
  version: number;
  sessionId: string;
  updatedAt: string;
}
