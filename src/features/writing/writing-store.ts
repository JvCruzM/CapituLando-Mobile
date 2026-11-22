import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  WritingEntry,
  WritingItemKind,
  WritingRecoveryState,
} from '../universe/types';
import type { WritingSessionConflict } from './types';

const ENTRIES_KEY = '@capitulando:writing_entries_v1';

export function countWords(text: string): number {
  const clean = text.trim();
  return clean ? clean.split(/\s+/).length : 0;
}

export async function getEntriesByStory(storyId: string): Promise<{
  chapters: WritingEntry[];
  drafts: WritingEntry[];
}> {
  const raw = await AsyncStorage.getItem(ENTRIES_KEY);
  const all: WritingEntry[] = raw ? JSON.parse(raw) : [];
  const filtered = all.filter((item) => item.storyId === storyId);

  return {
    chapters: filtered.filter((i) => i.kind === 'chapter'),
    drafts: filtered.filter((i) => i.kind === 'draft'),
  };
}

export async function upsertWritingEntry(input: {
  id?: string | null;
  storyId: string;
  title: string;
  content: string;
  kind: WritingItemKind;
  expectedVersion?: number;
  forceOverwrite?: boolean;
}): Promise<WritingEntry> {
  const raw = await AsyncStorage.getItem(ENTRIES_KEY);
  const all: WritingEntry[] = raw ? JSON.parse(raw) : [];
  const now = new Date().toISOString();
  const cleanTitle = input.title.trim() || 'Sem Título';
  const words = countWords(input.content);

  if (input.id) {
    const existing = all.find((item) => item.id === input.id);
    if (
      existing &&
      !input.forceOverwrite &&
      typeof input.expectedVersion === 'number' &&
      existing.version !== input.expectedVersion
    ) {
      const conflictError = new Error('VERSION_CONFLICT') as Error & {
        code?: string;
        serverEntry?: WritingEntry;
      };
      conflictError.code = 'VERSION_CONFLICT';
      conflictError.serverEntry = existing;
      throw conflictError;
    }

    const updated: WritingEntry = {
      id: input.id,
      storyId: input.storyId,
      title: cleanTitle,
      content: input.content,
      kind: input.kind,
      wordCount: words,
      version: (existing?.version ?? 0) + 1,
      updatedAt: now,
    };

    const next = all.map((item) => (item.id === input.id ? updated : item));
    await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(next));
    return updated;
  }

  const created: WritingEntry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    storyId: input.storyId,
    title: cleanTitle,
    content: input.content,
    kind: input.kind,
    wordCount: words,
    version: 1,
    updatedAt: now,
  };

  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify([...all, created]));
  return created;
}

export function getRecoveryKey(userId: string) {
  return `@capitulando:${userId}:writing_recovery_v1`;
}

export async function loadLocalRecovery(
  userId: string,
): Promise<WritingRecoveryState | null> {
  const raw = await AsyncStorage.getItem(getRecoveryKey(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WritingRecoveryState;
  } catch {
    return null;
  }
}

export async function saveLocalRecovery(
  userId: string,
  state: WritingRecoveryState,
): Promise<void> {
  await AsyncStorage.setItem(getRecoveryKey(userId), JSON.stringify(state));
}

export async function clearLocalRecovery(userId: string): Promise<void> {
  await AsyncStorage.removeItem(getRecoveryKey(userId));
}

export function detectRecoveryConflict(
  local: WritingRecoveryState | null,
  remote: WritingRecoveryState | null,
  currentSessionId: string,
): WritingSessionConflict | null {
  if (!local || !remote) return null;

  const localHasText = Boolean(local.content.trim() || local.title.trim());
  const remoteHasText = Boolean(remote.content.trim() || remote.title.trim());
  if (!localHasText || !remoteHasText) return null;

  const contentDiffers =
    local.content.trim() !== remote.content.trim() ||
    local.title.trim() !== remote.title.trim();
  const fromAnotherSession =
    Boolean(remote.sessionId) && remote.sessionId !== currentSessionId;

  if (contentDiffers && fromAnotherSession) {
    return { local, remote };
  }

  return null;
}