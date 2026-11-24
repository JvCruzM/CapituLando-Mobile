export type WritingItemKind = 'chapter' | 'draft';

export type WritingItemStatus =
  | 'draft'
  | 'in_review'
  | 'published'
  | 'archived';

export type FontChoice = 'serif' | 'sans' | 'mono';
export type SpacingChoice = 'normal' | 'relaxed' | 'loose';

export type FormattingAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'heading'
  | 'quote'
  | 'list';

export interface WritingEntry {
  id: string;
  storyId: string;
  title: string;
  content: string;
  kind: WritingItemKind;
  status: WritingItemStatus;
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
  status: WritingItemStatus;
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