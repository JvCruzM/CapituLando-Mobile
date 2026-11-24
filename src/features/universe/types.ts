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
  image?: string | null;
  raceId?: string | null;
  raceName?: string | null;
  parentLocationId?: string | null;
  parentLocationName?: string | null;
  headquartersLocationId?: string | null;
  headquartersLocationName?: string | null;
  conceptCategory?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CharacterRole =
  | "Protagonista"
  | "Antagonista"
  | "Mentor"
  | "Aliado"
  | "Secundário";

export type CharacterImageFit = "cover" | "contain";
export type CharacterImagePosition = "center" | "top" | "bottom";

export interface CharacterItem {
  id: string;
  name: string;
  alias?: string;
  role: CharacterRole;
  raceId?: string | null;
  race: string;
  organizationIds?: string[];
  organization?: string;
  occupation: string;
  archetype: string;
  age?: number | null;
  height?: string;
  weight?: string;
  zodiac?: string;
  bloodType?: string;
  mbti?: string;
  likes?: string;
  dislikes?: string;
  drinks?: string;
  characterImage?: string | null;
  imageFit?: CharacterImageFit;
  imagePosition?: CharacterImagePosition;
  appearance: string;
  personality: string;
  motivation: string;
  internalConflict: string;
  backstory: string;
  notes?: string;
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
  chapterId?: string | null;
  chapterTitle?: string;
  locationId?: string | null;
  location?: string;
  characterIds?: string[];
  charactersInvolved: string[];
  eventImage?: string | null;
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
