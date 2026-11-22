export type WritingItemKind = 'chapter' | 'draft';

export type FontChoice = 'serif' | 'sans' | 'mono';
export type SpacingChoice = 'normal' | 'relaxed' | 'loose';

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

export interface WritingStorySummary {
  id: string;
  title: string;
  genre?: string;
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

export interface WritingSessionConflict {
  local: WritingRecoveryState;
  remote: WritingRecoveryState;
}