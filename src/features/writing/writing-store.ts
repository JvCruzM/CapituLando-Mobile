import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  WritingEntry,
  WritingItemKind,
  WritingRecoveryState,
  WritingSessionConflict,
  WritingStorySummary,
} from './types';

const ENTRIES_CACHE_PREFIX = '@capitulando:entries_cache_v2';
const RECOVERY_CACHE_PREFIX = '@capitulando:recovery_v2';

// Fila serial por chave para evitar condições de corrida em leituras/gravações concorrentes
const operationQueues = new Map<string, Promise<unknown>>();

export function runSerialized<T>(queueKey: string, task: () => Promise<T>): Promise<T> {
  const prev = operationQueues.get(queueKey) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(task);
  const tracked = next.then(
    () => undefined,
    () => undefined,
  );
  operationQueues.set(queueKey, tracked);
  return next;
}

export function countWords(text: string): number {
  const clean = text.trim();
  return clean ? clean.split(/\s+/).length : 0;
}

function entriesCacheKey(userId: string, storyId: string) {
  return `${ENTRIES_CACHE_PREFIX}:${userId}:${storyId}`;
}

export function getRecoveryKey(userId: string, storyId: string) {
  return `${RECOVERY_CACHE_PREFIX}:${userId}:${storyId}`;
}

export interface WritingApiConfig {
  baseUrl?: string;
  token?: string | null;
  userId: string;
  sessionId: string;
}

function buildHeaders(config: WritingApiConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-id': config.userId,
    'x-session-id': config.sessionId,
  };
  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  }
  return headers;
}

export async function readCachedEntries(
  userId: string,
  storyId: string,
): Promise<{ chapters: WritingEntry[]; drafts: WritingEntry[] }> {
  return runSerialized(`cache:entries:${userId}:${storyId}`, async () => {
    const raw = await AsyncStorage.getItem(entriesCacheKey(userId, storyId));
    if (!raw) return { chapters: [], drafts: [] };
    try {
      const parsed = JSON.parse(raw) as {
        chapters?: WritingEntry[];
        drafts?: WritingEntry[];
      };
      return {
        chapters: Array.isArray(parsed.chapters) ? parsed.chapters : [],
        drafts: Array.isArray(parsed.drafts) ? parsed.drafts : [],
      };
    } catch {
      return { chapters: [], drafts: [] };
    }
  });
}

export async function writeCachedEntries(
  userId: string,
  storyId: string,
  data: { chapters: WritingEntry[]; drafts: WritingEntry[] },
): Promise<void> {
  return runSerialized(`cache:entries:${userId}:${storyId}`, async () => {
    await AsyncStorage.setItem(entriesCacheKey(userId, storyId), JSON.stringify(data));
  });
}

export async function fetchStoriesFromApi(
  config: WritingApiConfig,
): Promise<WritingStorySummary[]> {
  if (!config.baseUrl) return [];
  const res = await fetch(`${config.baseUrl}/api/writing/projects`, {
    method: 'GET',
    headers: buildHeaders(config),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Falha ao carregar livros (${res.status}).`);
  }
  const data = await res.json();
  const list = Array.isArray(data?.projects) ? data.projects : Array.isArray(data) ? data : [];
  return list.map((item: { id: string; title: string; genre?: string }) => ({
    id: String(item.id),
    title: String(item.title),
    genre: item.genre,
  }));
}

export async function fetchEntriesFromApi(
  config: WritingApiConfig,
  storyId: string,
): Promise<{ chapters: WritingEntry[]; drafts: WritingEntry[] }> {
  if (!config.baseUrl) {
    return readCachedEntries(config.userId, storyId);
  }
  const res = await fetch(
    `${config.baseUrl}/api/writing/stories/${encodeURIComponent(storyId)}/items`,
    {
      method: 'GET',
      headers: buildHeaders(config),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body?.error?.message || `Falha ao carregar capítulos e rascunhos (${res.status}).`,
    );
  }
  const data = await res.json();
  const normalize = (arr: unknown[], kind: WritingItemKind): WritingEntry[] =>
    (Array.isArray(arr) ? arr : []).map((raw) => {
      const r = raw as Record<string, unknown>;
      const content = String(r.content ?? '');
      return {
        id: String(r.id),
        storyId: String(r.story_id ?? r.storyId ?? storyId),
        title: String(r.title ?? 'Sem Título'),
        content,
        kind: (r.kind === 'draft' || r.kind === 'chapter' ? r.kind : kind),
        wordCount: Number(r.word_count ?? r.wordCount ?? countWords(content)),
        version: Number(r.version ?? 1),
        updatedAt: String(r.updated_at ?? r.updatedAt ?? new Date().toISOString()),
      };
    });

  const result = {
    chapters: normalize(data?.chapters, 'chapter'),
    drafts: normalize(data?.drafts, 'draft'),
  };
  await writeCachedEntries(config.userId, storyId, result);
  return result;
}

export async function saveEntryWithVersionControl(
  config: WritingApiConfig,
  input: {
    id?: string | null;
    storyId: string;
    title: string;
    content: string;
    kind: WritingItemKind;
    expectedVersion?: number;
    forceOverwrite?: boolean;
  },
): Promise<WritingEntry> {
  const queueKey = `save:${config.userId}:${input.storyId}:${input.id ?? 'new'}`;

  return runSerialized(queueKey, async () => {
    const cleanTitle = input.title.trim() || 'Sem Título';
    const words = countWords(input.content);

    if (config.baseUrl) {
      const isUpdate = Boolean(input.id);
      const url = isUpdate
        ? `${config.baseUrl}/api/writing/stories/${encodeURIComponent(input.storyId)}/items/${encodeURIComponent(String(input.id))}`
        : `${config.baseUrl}/api/writing/stories/${encodeURIComponent(input.storyId)}/items`;

      const res = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: buildHeaders(config),
        body: JSON.stringify({
          title: cleanTitle,
          content: input.content,
          kind: input.kind,
          expectedVersion: input.expectedVersion,
          forceOverwrite: input.forceOverwrite ?? false,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (res.status === 409) {
        const conflictErr = new Error(
          body?.error?.message || 'Conflito de versão no servidor.',
        ) as Error & {
          code?: string;
          serverEntry?: WritingEntry;
        };
        conflictErr.code = 'VERSION_CONFLICT';
        if (body?.error?.details?.serverItem) {
          const s = body.error.details.serverItem;
          conflictErr.serverEntry = {
            id: String(s.id),
            storyId: String(s.story_id ?? input.storyId),
            title: String(s.title ?? cleanTitle),
            content: String(s.content ?? ''),
            kind: s.kind === 'draft' ? 'draft' : 'chapter',
            wordCount: Number(s.word_count ?? countWords(String(s.content ?? ''))),
            version: Number(s.version ?? 1),
            updatedAt: String(s.updated_at ?? new Date().toISOString()),
          };
        }
        throw conflictErr;
      }

      if (!res.ok) {
        throw new Error(body?.error?.message || `Erro ao salvar no servidor (${res.status}).`);
      }

      const r = body?.chapter ?? body;
      const saved: WritingEntry = {
        id: String(r.id),
        storyId: String(r.story_id ?? r.storyId ?? input.storyId),
        title: String(r.title ?? cleanTitle),
        content: String(r.content ?? input.content),
        kind: r.kind === 'draft' || r.kind === 'chapter' ? r.kind : input.kind,
        wordCount: Number(r.word_count ?? r.wordCount ?? words),
        version: Number(r.version ?? 1),
        updatedAt: String(r.updated_at ?? r.updatedAt ?? new Date().toISOString()),
      };

      const currentCache = await readCachedEntries(config.userId, input.storyId);
      const targetKey = saved.kind === 'chapter' ? 'chapters' : 'drafts';
      const otherKey = saved.kind === 'chapter' ? 'drafts' : 'chapters';
      await writeCachedEntries(config.userId, input.storyId, {
        chapters: [
          ...currentCache.chapters.filter((c) => c.id !== saved.id),
          ...(targetKey === 'chapters' ? [saved] : []),
        ].filter((c) => !(otherKey === 'chapters' && c.id === saved.id)),
        drafts: [
          ...currentCache.drafts.filter((d) => d.id !== saved.id),
          ...(targetKey === 'drafts' ? [saved] : []),
        ].filter((d) => !(otherKey === 'drafts' && d.id === saved.id)),
      });

      return saved;
    }

    // Fallback local atômico serializado quando não há baseUrl configurada
    const currentCache = await readCachedEntries(config.userId, input.storyId);
    const all = [...currentCache.chapters, ...currentCache.drafts];
    const now = new Date().toISOString();

    if (input.id) {
      const existing = all.find((item) => item.id === input.id);
      if (
        existing &&
        !input.forceOverwrite &&
        typeof input.expectedVersion === 'number' &&
        existing.version !== input.expectedVersion
      ) {
        const conflictErr = new Error('VERSION_CONFLICT') as Error & {
          code?: string;
          serverEntry?: WritingEntry;
        };
        conflictErr.code = 'VERSION_CONFLICT';
        conflictErr.serverEntry = existing;
        throw conflictErr;
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

      const remaining = all.filter((item) => item.id !== input.id);
      const merged = [...remaining, updated];
      const nextCache = {
        chapters: merged.filter((m) => m.kind === 'chapter'),
        drafts: merged.filter((m) => m.kind === 'draft'),
      };
      await writeCachedEntries(config.userId, input.storyId, nextCache);
      return updated;
    }

    const created: WritingEntry = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      storyId: input.storyId,
      title: cleanTitle,
      content: input.content,
      kind: input.kind,
      wordCount: words,
      version: 1,
      updatedAt: now,
    };

    const merged = [...all, created];
    await writeCachedEntries(config.userId, input.storyId, {
      chapters: merged.filter((m) => m.kind === 'chapter'),
      drafts: merged.filter((m) => m.kind === 'draft'),
    });
    return created;
  });
}

export async function loadLocalRecovery(
  userId: string,
  storyId: string,
): Promise<WritingRecoveryState | null> {
  return runSerialized(`recovery:${userId}:${storyId}`, async () => {
    const raw = await AsyncStorage.getItem(getRecoveryKey(userId, storyId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as WritingRecoveryState;
    } catch {
      return null;
    }
  });
}

export async function saveLocalRecovery(
  userId: string,
  storyId: string,
  state: WritingRecoveryState,
): Promise<void> {
  return runSerialized(`recovery:${userId}:${storyId}`, async () => {
    await AsyncStorage.setItem(getRecoveryKey(userId, storyId), JSON.stringify(state));
  });
}

export async function clearLocalRecovery(
  userId: string,
  storyId: string,
): Promise<void> {
  return runSerialized(`recovery:${userId}:${storyId}`, async () => {
    await AsyncStorage.removeItem(getRecoveryKey(userId, storyId));
  });
}

export async function fetchRemoteRecoveryFromApi(
  config: WritingApiConfig,
  storyId: string,
): Promise<WritingRecoveryState | null> {
  if (!config.baseUrl) return null;
  const res = await fetch(
    `${config.baseUrl}/api/writing/workspace?storyId=${encodeURIComponent(storyId)}`,
    {
      method: 'GET',
      headers: buildHeaders(config),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body?.error?.message || `Falha ao buscar recuperação remota (${res.status}).`,
    );
  }
  const data = await res.json();
  if (!data || !data.content) return null;
  return {
    storyId: String(data.projectId ?? data.storyId ?? storyId),
    itemId: data.chapterId ?? data.itemId ?? null,
    kind: data.kind === 'draft' ? 'draft' : 'chapter',
    title: String(data.title ?? 'Novo Capítulo'),
    content: String(data.content ?? ''),
    version: Number(data.version ?? 1),
    sessionId: String(data.sessionId ?? ''),
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  };
}

export async function syncRemoteRecoveryToApi(
  config: WritingApiConfig,
  state: WritingRecoveryState | null,
  forceOverwrite = false,
): Promise<WritingRecoveryState | null> {
  if (!config.baseUrl) return state;

  const payload = state
    ? {
        projectId: state.storyId,
        chapterId: state.itemId,
        kind: state.kind,
        title: state.title,
        content: state.content,
        expectedVersion: state.version,
        forceOverwrite,
      }
    : {
        projectId: null,
        chapterId: null,
        kind: 'chapter',
        title: '',
        content: '',
        forceOverwrite: true,
      };

  const res = await fetch(`${config.baseUrl}/api/writing/workspace`, {
    method: 'PUT',
    headers: buildHeaders(config),
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));

  if (res.status === 409 && body?.error?.details?.serverState) {
    const s = body.error.details.serverState;
    const conflictErr = new Error(
      body?.error?.message || 'Conflito entre sessões no espaço de escrita.',
    ) as Error & {
      code?: string;
      remoteConflict?: WritingRecoveryState;
    };
    conflictErr.code = 'SESSION_CONFLICT';
    conflictErr.remoteConflict = {
      storyId: String(s.projectId ?? s.storyId ?? state?.storyId ?? ''),
      itemId: s.chapterId ?? s.itemId ?? null,
      kind: s.kind === 'draft' ? 'draft' : 'chapter',
      title: String(s.title ?? 'Novo Capítulo'),
      content: String(s.content ?? ''),
      version: Number(s.version ?? 1),
      sessionId: String(s.sessionId ?? ''),
      updatedAt: String(s.updatedAt ?? new Date().toISOString()),
    };
    throw conflictErr;
  }

  if (!res.ok) {
    throw new Error(
      body?.error?.message || `Falha ao sincronizar espaço de escrita (${res.status}).`,
    );
  }

  if (!state || body?.cleared) return null;

  return {
    ...state,
    version: Number(body?.version ?? state.version),
    sessionId: String(body?.sessionId ?? state.sessionId),
    updatedAt: String(body?.updatedAt ?? new Date().toISOString()),
  };
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