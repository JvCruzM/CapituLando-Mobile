import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type {
  WritingEntry,
  WritingItemKind,
  WritingRecoveryState,
  WritingSessionConflict,
  WritingStorySummary,
} from './types';

const ENTRIES_CACHE_PREFIX = '@capitulando:entries_cache_v3';
const RECOVERY_CACHE_PREFIX = '@capitulando:recovery_v3';

// Fila única por usuário e história para serializar leitura, alteração e gravação da história inteira
const storyQueues = new Map<string, Promise<unknown>>();

export function runStorySerialized<T>(
  userId: string,
  storyId: string,
  task: () => Promise<T>,
): Promise<T> {
  const key = `story:${userId}:${storyId}`;
  const prev = storyQueues.get(key) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(task);
  const tracked = next.then(
    () => undefined,
    () => undefined,
  );
  storyQueues.set(key, tracked);
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

export async function readTokenFromSecureStore(): Promise<string | null> {
  const candidateKeys = [
    'capitulando_token',
    'capitulando_access_token',
    'auth_token',
    'accessToken',
    'token',
  ];
  for (const k of candidateKeys) {
    try {
      const val = await SecureStore.getItemAsync(k);
      if (val && val.trim()) return val.trim();
    } catch {
      // Ignora caso a chave não exista
    }
  }
  return null;
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

async function readCacheUnlocked(
  userId: string,
  storyId: string,
): Promise<{ chapters: WritingEntry[]; drafts: WritingEntry[] }> {
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
}

async function writeCacheUnlocked(
  userId: string,
  storyId: string,
  data: { chapters: WritingEntry[]; drafts: WritingEntry[] },
): Promise<void> {
  await AsyncStorage.setItem(entriesCacheKey(userId, storyId), JSON.stringify(data));
}

export async function readCachedEntries(
  userId: string,
  storyId: string,
): Promise<{ chapters: WritingEntry[]; drafts: WritingEntry[] }> {
  return runStorySerialized(userId, storyId, () =>
    readCacheUnlocked(userId, storyId),
  );
}

export async function writeCachedEntries(
  userId: string,
  storyId: string,
  data: { chapters: WritingEntry[]; drafts: WritingEntry[] },
): Promise<void> {
  return runStorySerialized(userId, storyId, () =>
    writeCacheUnlocked(userId, storyId, data),
  );
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
    throw new Error(
      body?.error?.message || `Falha ao carregar projetos (${res.status}).`,
    );
  }
  const data = await res.json();
  const list = Array.isArray(data?.projects)
    ? data.projects
    : Array.isArray(data)
      ? data
      : [];
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
  return runStorySerialized(config.userId, storyId, async () => {
    if (!config.baseUrl) {
      return readCacheUnlocked(config.userId, storyId);
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
        body?.error?.message ||
          `Falha ao carregar capítulos e rascunhos (${res.status}).`,
      );
    }

    const data = await res.json();
    const normalize = (arr: unknown[], kind: WritingItemKind): WritingEntry[] =>
      (Array.isArray(arr) ? arr : []).map((raw) => {
        const r = raw as Record<string, unknown>;
        const content = String(r.content ?? '');
        const resolvedKind: WritingItemKind =
          r.kind === 'draft' || r.kind === 'chapter'
            ? r.kind
            : r.status === 'DRAFT'
              ? 'draft'
              : kind;
        return {
          id: String(r.id),
          storyId: String(r.story_id ?? r.storyId ?? storyId),
          title: String(r.title ?? 'Sem Título'),
          content,
          kind: resolvedKind,
          wordCount: Number(r.word_count ?? r.wordCount ?? countWords(content)),
          version: Number(r.version ?? 1),
          updatedAt: String(
            r.updated_at ?? r.updatedAt ?? new Date().toISOString(),
          ),
        };
      });

    const result = {
      chapters: normalize(data?.chapters, 'chapter'),
      drafts: normalize(data?.drafts, 'draft'),
    };
    await writeCacheUnlocked(config.userId, storyId, result);
    return result;
  });
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
): Promise<{
  saved: WritingEntry;
  storyEntries: { chapters: WritingEntry[]; drafts: WritingEntry[] };
}> {
  // Serializa a operação inteira (leitura do cache -> API/gravação -> atualização do cache da história)
  return runStorySerialized(config.userId, input.storyId, async () => {
    const cleanTitle = input.title.trim() || 'Sem Título';
    const words = countWords(input.content);
    const currentCache = await readCacheUnlocked(config.userId, input.storyId);

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
          status: input.kind === 'draft' ? 'DRAFT' : 'IN_REVIEW',
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
        const rawServer = body?.error?.details?.serverItem;
        if (rawServer) {
          const s = rawServer as Record<string, unknown>;
          const sContent = String(s.content ?? '');
          conflictErr.serverEntry = {
            id: String(s.id),
            storyId: String(s.story_id ?? s.storyId ?? input.storyId),
            title: String(s.title ?? cleanTitle),
            content: sContent,
            kind:
              s.kind === 'draft' || s.status === 'DRAFT' ? 'draft' : 'chapter',
            wordCount: Number(s.word_count ?? s.wordCount ?? countWords(sContent)),
            version: Number(s.version ?? 1),
            updatedAt: String(
              s.updated_at ?? s.updatedAt ?? new Date().toISOString(),
            ),
          };
        }
        throw conflictErr;
      }

      if (!res.ok) {
        throw new Error(
          body?.error?.message || `Erro ao salvar no servidor (${res.status}).`,
        );
      }

      const rawSaved = (body?.chapter ?? body?.item ?? body) as Record<
        string,
        unknown
      >;
      const savedContent = String(rawSaved.content ?? input.content);
      const savedKind: WritingItemKind =
        rawSaved.kind === 'draft' || rawSaved.kind === 'chapter'
          ? rawSaved.kind
          : rawSaved.status === 'DRAFT'
            ? 'draft'
            : input.kind;

      const saved: WritingEntry = {
        id: String(rawSaved.id),
        storyId: String(
          rawSaved.story_id ?? rawSaved.storyId ?? input.storyId,
        ),
        title: String(rawSaved.title ?? cleanTitle),
        content: savedContent,
        kind: savedKind,
        wordCount: Number(
          rawSaved.word_count ?? rawSaved.wordCount ?? countWords(savedContent),
        ),
        version: Number(rawSaved.version ?? 1),
        updatedAt: String(
          rawSaved.updated_at ?? rawSaved.updatedAt ?? new Date().toISOString(),
        ),
      };

      const nextEntries = {
        chapters: [
          ...currentCache.chapters.filter((c) => c.id !== saved.id),
          ...(saved.kind === 'chapter' ? [saved] : []),
        ],
        drafts: [
          ...currentCache.drafts.filter((d) => d.id !== saved.id),
          ...(saved.kind === 'draft' ? [saved] : []),
        ],
      };

      await writeCacheUnlocked(config.userId, input.storyId, nextEntries);
      return { saved, storyEntries: nextEntries };
    }

    // Fallback local serializado pela fila da história inteira
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

      const merged = [...all.filter((item) => item.id !== input.id), updated];
      const nextEntries = {
        chapters: merged.filter((m) => m.kind === 'chapter'),
        drafts: merged.filter((m) => m.kind === 'draft'),
      };
      await writeCacheUnlocked(config.userId, input.storyId, nextEntries);
      return { saved: updated, storyEntries: nextEntries };
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
    const nextEntries = {
      chapters: merged.filter((m) => m.kind === 'chapter'),
      drafts: merged.filter((m) => m.kind === 'draft'),
    };
    await writeCacheUnlocked(config.userId, input.storyId, nextEntries);
    return { saved: created, storyEntries: nextEntries };
  });
}

export async function loadLocalRecovery(
  userId: string,
  storyId: string,
): Promise<WritingRecoveryState | null> {
  return runStorySerialized(userId, storyId, async () => {
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
  return runStorySerialized(userId, storyId, async () => {
    await AsyncStorage.setItem(
      getRecoveryKey(userId, storyId),
      JSON.stringify(state),
    );
  });
}

export async function clearLocalRecovery(
  userId: string,
  storyId: string,
): Promise<void> {
  return runStorySerialized(userId, storyId, async () => {
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
      body?.error?.message ||
        `Falha ao buscar recuperação remota (${res.status}).`,
    );
  }
  const data = await res.json();
  const rec = data?.recovery ?? data;
  if (!rec || !rec.content) return null;
  return {
    storyId: String(rec.projectId ?? rec.storyId ?? storyId),
    itemId: rec.chapterId ?? rec.itemId ?? null,
    kind: rec.kind === 'draft' || rec.type === 'draft' ? 'draft' : 'chapter',
    title: String(rec.title ?? 'Novo Capítulo'),
    content: String(rec.content ?? ''),
    version: Number(rec.version ?? 1),
    sessionId: String(rec.sessionId ?? ''),
    updatedAt: String(rec.updatedAt ?? new Date().toISOString()),
  };
}

export async function syncRemoteRecoveryToApi(
  config: WritingApiConfig,
  state: WritingRecoveryState | null,
  forceOverwrite = false,
): Promise<WritingRecoveryState | null> {
  if (!config.baseUrl) return state;

  const targetStoryId = state?.storyId || '';
  const execute = async (): Promise<WritingRecoveryState | null> => {
    const payload = state
      ? {
          projectId: state.storyId,
          storyId: state.storyId,
          chapterId: state.itemId,
          kind: state.kind,
          type: state.kind,
          title: state.title,
          content: state.content,
          expectedVersion: state.version,
          forceOverwrite,
        }
      : {
          projectId: null,
          storyId: null,
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
      const s = body.error.details.serverState as Record<string, unknown>;
      const conflictErr = new Error(
        body?.error?.message || 'Conflito entre sessões no espaço de escrita.',
      ) as Error & {
        code?: string;
        remoteConflict?: WritingRecoveryState;
      };
      conflictErr.code = 'SESSION_CONFLICT';
      conflictErr.remoteConflict = {
        storyId: String(s.projectId ?? s.storyId ?? state?.storyId ?? ''),
        itemId: (s.chapterId ?? s.itemId ?? null) as string | null,
        kind: s.kind === 'draft' || s.type === 'draft' ? 'draft' : 'chapter',
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
        body?.error?.message ||
          `Falha ao sincronizar recuperação (${res.status}).`,
      );
    }

    const savedRec = body?.recovery ?? body;
    if (!state || body?.cleared) return null;

    return {
      ...state,
      version: Number(savedRec?.version ?? state.version),
      sessionId: String(savedRec?.sessionId ?? state.sessionId),
      updatedAt: String(savedRec?.updatedAt ?? new Date().toISOString()),
    };
  };

  if (targetStoryId) {
    return runStorySerialized(config.userId, targetStoryId, execute);
  }
  return execute();
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