export type EncyclopediaCategory =
  | "races"
  | "creatures"
  | "items"
  | "locations"
  | "organizations"
  | "world-rules"
  | "theme";

export interface EncyclopediaItem {
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
