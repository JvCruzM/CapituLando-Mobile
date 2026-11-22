import type { WritingRecoveryState } from '../universe/types';

export type FontChoice = 'serif' | 'sans' | 'mono';
export type SpacingChoice = 'normal' | 'relaxed' | 'loose';

export interface WritingSessionConflict {
  local: WritingRecoveryState;
  remote: WritingRecoveryState;
}