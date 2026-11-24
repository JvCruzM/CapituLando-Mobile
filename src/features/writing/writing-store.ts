import { useAuthStore } from "../auth/session";
import { plainText } from "./components/editor-content";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { accountRequest } from "../../shared/api/account";
import type {
  WritingEntry,
  WritingItemKind,
  WritingItemStatus,
  WritingRecoveryState,
  WritingSessionConflict,
  WritingStorySummary,
} from "./types";

const ENTRIES_CACHE_PREFIX = "@capitulando:entries_cache_v4";
const RECOVERY_CACHE_PREFIX = "@capitulando:recovery_v4";

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

export function normalizeItemStatus(
  rawStatus: unknown,
  fallbackKind: WritingItemKind = "chapter",
): WritingItemStatus {
  const val = String(rawStatus ?? "").toLowerCase();
  if (val === "draft") return "draft";
  if (val === "in_review" || val === "review") return "in_review";
  if (val === "published" || val === "publish") return "published";
  if (val === "archived" || val === "archive") return "archived";
  return fallbackKind === "draft" ? "draft" : "in_review";
}

export function getStatusLabel(status: WritingItemStatus): string {
  switch (status) {
    case "draft":
      return "Rascunho";
    case "in_review":
      return "Em revisão";
    case "published":
      return "Publicado";
    case "archived":
      return "Arquivado";
    default:
      return "Em revisão";
  }
}

export function countWords(text: string): number {
  const clean = plainText(text).trim();
  return clean ? clean.split(/\s+/).length : 0;
}

function entriesCacheKey(userId: string, storyId: string) {
  return `${ENTRIES_CACHE_PREFIX}:${userId}:${storyId}`;
}

export function getRecoveryKey(userId: string, storyId: string) {
  return `${RECOVERY_CACHE_PREFIX}:${userId}:${storyId}`;
}

async function writingRequest(url: string, init: RequestInit = {}) {
  const current = useAuthStore.getState().session;
  const headers = init.headers as Record<string, string>;
  if (
    !current ||
    current.user.id !== headers["x-user-id"] ||
    current.sessionId !== headers["x-session-id"]
  )
    throw new Error("A sessão mudou. Abra a escrita novamente.");
  const path = url.slice(url.indexOf("/api/"));
  try {
    const data = await accountRequest<unknown>({
      url: path,
      method: init.method ?? "GET",
      data: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
    });
    return { ok: true, status: 200, json: async () => data as any };
  } catch (error) {
    if (!axios.isAxiosError(error) || !error.response) throw error;
    const response = error.response;
    return {
      ok: false,
      status: response.status,
      json: async () => response.data as any,
    };
  }
}
const recoveryVersions = new Map<string, number>();
const recoveryBlocked = new Map<string, { sessionId: string; error: Error }>();

export interface WritingApiConfig {
  storyId?: string;
  baseUrl?: string;
  token?: string | null;
  userId: string;
  sessionId: string;
}

function buildHeaders(config: WritingApiConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-user-id": config.userId,
    "x-session-id": config.sessionId,
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
  const raw =
    (await AsyncStorage.getItem(entriesCacheKey(userId, storyId))) ??
    (await AsyncStorage.getItem(
      `@capitulando:entries_cache_v3:${userId}:${storyId}`,
    ));
  if (!raw) return { chapters: [], drafts: [] };
  try {
    const parsed = JSON.parse(raw) as {
      chapters?: WritingEntry[];
      drafts?: WritingEntry[];
    };
    return {
      chapters: Array.isArray(parsed.chapters)
        ? parsed.chapters.map((e) => ({
            ...e,
            status: normalizeItemStatus(e.status, e.kind),
          }))
        : [],
      drafts: Array.isArray(parsed.drafts)
        ? parsed.drafts.map((e) => ({
            ...e,
            status: normalizeItemStatus(e.status, e.kind),
          }))
        : [],
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
  await AsyncStorage.setItem(
    entriesCacheKey(userId, storyId),
    JSON.stringify(data),
  );
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
  const res = await writingRequest(`${config.baseUrl}/api/writing/projects`, {
    method: "GET",
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

    const res = await writingRequest(
      `${config.baseUrl}/api/writing/stories/${encodeURIComponent(storyId)}/items`,
      {
        method: "GET",
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
        const content = String(r.content ?? "");
        const resolvedKind: WritingItemKind =
          r.kind === "draft" || r.kind === "chapter"
            ? r.kind
            : r.status === "DRAFT"
              ? "draft"
              : kind;
        return {
          id: String(r.id),
          storyId: String(r.story_id ?? r.storyId ?? storyId),
          title: String(r.title ?? "Sem Título"),
          content,
          kind: resolvedKind,
          status: normalizeItemStatus(r.status, resolvedKind),
          wordCount: Number(r.word_count ?? r.wordCount ?? countWords(content)),
          version: Number(r.version ?? 1),
          updatedAt: String(
            r.updated_at ?? r.updatedAt ?? new Date().toISOString(),
          ),
        };
      });

    const result = {
      chapters: normalize(data?.chapters, "chapter"),
      drafts: normalize(data?.drafts, "draft"),
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
    status?: WritingItemStatus;
    expectedVersion?: number;
    forceOverwrite?: boolean;
  },
): Promise<{
  saved: WritingEntry;
  storyEntries: { chapters: WritingEntry[]; drafts: WritingEntry[] };
}> {
  return runStorySerialized(config.userId, input.storyId, async () => {
    const resolvedStatus = normalizeItemStatus(input.status, input.kind);
    input = {
      ...input,
      kind: resolvedStatus === "draft" ? "draft" : "chapter",
    };
    const cleanTitle = input.title.trim() || "Sem Título";
    const words = countWords(input.content);
    const currentCache = await readCacheUnlocked(config.userId, input.storyId);

    if (config.baseUrl) {
      const isUpdate = Boolean(input.id);
      const url = isUpdate
        ? `${config.baseUrl}/api/writing/stories/${encodeURIComponent(input.storyId)}/items/${encodeURIComponent(String(input.id))}`
        : `${config.baseUrl}/api/writing/stories/${encodeURIComponent(input.storyId)}/items`;

      const res = await writingRequest(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: buildHeaders(config),
        body: JSON.stringify({
          title: cleanTitle,
          content: input.content,
          kind: input.kind,
          status: resolvedStatus.toUpperCase(),
          expectedVersion: input.expectedVersion,
          forceOverwrite: input.forceOverwrite ?? false,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (res.status === 409) {
        const conflictErr = new Error(
          body?.error?.message || "Conflito de versão no servidor.",
        ) as Error & {
          code?: string;
          serverEntry?: WritingEntry;
        };
        conflictErr.code = "VERSION_CONFLICT";
        const rawServer = body?.error?.details?.serverItem;
        if (rawServer) {
          const s = rawServer as Record<string, unknown>;
          const sContent = String(s.content ?? "");
          conflictErr.serverEntry = {
            id: String(s.id),
            storyId: String(s.story_id ?? s.storyId ?? input.storyId),
            title: String(s.title ?? cleanTitle),
            content: sContent,
            kind:
              s.kind === "draft" || s.status === "DRAFT" ? "draft" : "chapter",
            status: normalizeItemStatus(s.status, input.kind),
            wordCount: Number(
              s.word_count ?? s.wordCount ?? countWords(sContent),
            ),
            version: Number(s.version ?? s.revision ?? 0),
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
        rawSaved.kind === "draft" || rawSaved.kind === "chapter"
          ? rawSaved.kind
          : rawSaved.status === "DRAFT"
            ? "draft"
            : input.kind;

      const saved: WritingEntry = {
        id: String(rawSaved.id),
        storyId: String(rawSaved.story_id ?? rawSaved.storyId ?? input.storyId),
        title: String(rawSaved.title ?? cleanTitle),
        content: savedContent,
        kind: savedKind,
        status: normalizeItemStatus(rawSaved.status, savedKind),
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
          ...(saved.kind === "chapter" ? [saved] : []),
        ],
        drafts: [
          ...currentCache.drafts.filter((d) => d.id !== saved.id),
          ...(saved.kind === "draft" ? [saved] : []),
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
        typeof input.expectedVersion === "number" &&
        existing.version !== input.expectedVersion
      ) {
        const conflictErr = new Error("VERSION_CONFLICT") as Error & {
          code?: string;
          serverEntry?: WritingEntry;
        };
        conflictErr.code = "VERSION_CONFLICT";
        conflictErr.serverEntry = existing;
        throw conflictErr;
      }

      const updated: WritingEntry = {
        id: input.id,
        storyId: input.storyId,
        title: cleanTitle,
        content: input.content,
        kind: input.kind,
        status: resolvedStatus,
        wordCount: words,
        version: (existing?.version ?? 0) + 1,
        updatedAt: now,
      };

      const merged = [...all.filter((item) => item.id !== input.id), updated];
      const nextEntries = {
        chapters: merged.filter((m) => m.kind === "chapter"),
        drafts: merged.filter((m) => m.kind === "draft"),
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
      status: resolvedStatus,
      wordCount: words,
      version: 1,
      updatedAt: now,
    };

    const merged = [...all, created];
    const nextEntries = {
      chapters: merged.filter((m) => m.kind === "chapter"),
      drafts: merged.filter((m) => m.kind === "draft"),
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
    const raw =
      (await AsyncStorage.getItem(getRecoveryKey(userId, storyId))) ??
      (await AsyncStorage.getItem(
        `@capitulando:recovery_v3:${userId}:${storyId}`,
      ));
    if (!raw) return null;
    try {
      const state = JSON.parse(raw) as WritingRecoveryState;
      return {
        ...state,
        status: normalizeItemStatus(state.status, state.kind),
      };
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
    await AsyncStorage.multiRemove([
      getRecoveryKey(userId, storyId),
      `@capitulando:recovery_v3:${userId}:${storyId}`,
    ]);
  });
}

export async function fetchRemoteRecoveryFromApi(
  config: WritingApiConfig,
  storyId: string,
): Promise<WritingRecoveryState | null> {
  if (!config.baseUrl) return null;
  const res = await writingRequest(
    `${config.baseUrl}/api/writing/workspace?storyId=${encodeURIComponent(storyId)}`,
    {
      method: "GET",
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
  recoveryVersions.set(config.userId, Number(rec?.version ?? 0));
  if (
    !rec ||
    (!rec.content && !rec.title) ||
    (rec.projectId ?? rec.storyId) !== storyId
  )
    return null;
  return {
    storyId: String(rec.projectId ?? rec.storyId ?? storyId),
    itemId: rec.chapterId ?? rec.itemId ?? null,
    kind: rec.kind === "draft" || rec.type === "draft" ? "draft" : "chapter",
    status: normalizeItemStatus(
      rec.status,
      rec.kind === "draft" || rec.type === "draft" ? "draft" : "chapter",
    ),
    title: String(rec.title ?? "Novo Capítulo"),
    content: String(rec.content ?? ""),
    version: Number(rec.chapterRevision ?? rec.chapterVersion ?? 0),
    sessionId: String(rec.sessionId ?? ""),
    updatedAt: String(rec.updatedAt ?? new Date().toISOString()),
  };
}

export async function syncRemoteRecoveryToApi(
  config: WritingApiConfig,
  state: WritingRecoveryState | null,
  forceOverwrite = false,
): Promise<WritingRecoveryState | null> {
  if (!config.baseUrl) return state;

  const targetStoryId = state?.storyId || config.storyId || "";
  let retriedCleared = false;
  const execute = async (): Promise<WritingRecoveryState | null> => {
    const blocked = recoveryBlocked.get(config.userId);
    if (!forceOverwrite && blocked?.sessionId === config.sessionId)
      throw blocked.error;
    if (forceOverwrite && state && targetStoryId)
      await fetchRemoteRecoveryFromApi(config, targetStoryId);
    const expectedVersion = recoveryVersions.get(config.userId);
    if (expectedVersion === undefined)
      throw new Error("Atualize a recuperação antes de salvar.");
    const payload = state
      ? {
          projectId: state.storyId,
          storyId: state.storyId,
          chapterId: state.itemId,
          kind: state.kind,
          type: state.kind,
          title: state.title,
          content: state.content,
          expectedVersion,
          chapterVersion: state.version,
          status: state.status,
          forceOverwrite,
        }
      : {
          projectId: targetStoryId,
          storyId: targetStoryId,
          expectedVersion,
          clear: true,
          kind: "chapter",
          title: "",
          content: "",
          forceOverwrite: true,
        };

    const res = await writingRequest(
      `${config.baseUrl}/api/writing/workspace`,
      {
        method: "PUT",
        headers: buildHeaders(config),
        body: JSON.stringify(payload),
      },
    );

    const body = await res.json().catch(() => ({}));

    if (res.status === 409 && body?.error?.details?.serverState) {
      const s = body.error.details.serverState as Record<string, unknown>;
      recoveryVersions.set(config.userId, Number(s.version ?? 0));
      if (
        !retriedCleared &&
        !String(s.content ?? "").trim() &&
        !String(s.title ?? "").trim()
      ) {
        retriedCleared = true;
        return execute();
      }
      const conflictErr = new Error(
        body?.error?.message || "Conflito entre sessões no espaço de escrita.",
      ) as Error & {
        code?: string;
        remoteConflict?: WritingRecoveryState;
      };
      conflictErr.code = "SESSION_CONFLICT";
      conflictErr.remoteConflict = {
        storyId: String(s.projectId ?? s.storyId ?? state?.storyId ?? ""),
        itemId: (s.chapterId ?? s.itemId ?? null) as string | null,
        kind: s.kind === "draft" || s.type === "draft" ? "draft" : "chapter",
        status: normalizeItemStatus(
          s.status,
          s.kind === "draft" || s.type === "draft" ? "draft" : "chapter",
        ),
        title: String(s.title ?? "Novo Capítulo"),
        content: String(s.content ?? ""),
        version: Number(s.chapterRevision ?? s.chapterVersion ?? 0),
        sessionId: String(s.sessionId ?? ""),
        updatedAt: String(s.updatedAt ?? new Date().toISOString()),
      };
      recoveryBlocked.set(config.userId, {
        sessionId: config.sessionId,
        error: conflictErr,
      });
      throw conflictErr;
    }

    if (!res.ok) {
      throw new Error(
        body?.error?.message ||
          `Falha ao sincronizar recuperação (${res.status}).`,
      );
    }

    recoveryBlocked.delete(config.userId);
    const savedRec = body?.recovery ?? body;
    recoveryVersions.set(config.userId, Number(savedRec?.version ?? 0));
    if (!state || body?.cleared) return null;

    return {
      ...state,
      version: state.version,
      sessionId: String(savedRec?.sessionId ?? state.sessionId),
      updatedAt: String(savedRec?.updatedAt ?? new Date().toISOString()),
    };
  };

  if (targetStoryId) {
    return runStorySerialized(config.userId, "@workspace", execute);
  }
  return execute();
}

export function detectRecoveryConflict(
  local: WritingRecoveryState | null,
  remote: WritingRecoveryState | null,
  currentSessionId: string,
): WritingSessionConflict | null {
  if (!local || !remote || local.storyId !== remote.storyId) return null;

  const localHasText = Boolean(local.content.trim() || local.title.trim());
  const remoteHasText = Boolean(remote.content.trim() || remote.title.trim());
  if (!localHasText || !remoteHasText) return null;

  const contentDiffers =
    local.content.trim() !== remote.content.trim() ||
    local.title.trim() !== remote.title.trim();
  const fromAnotherSession = remote.sessionId !== currentSessionId;

  if (contentDiffers && fromAnotherSession) {
    return { local, remote };
  }

  return null;
}

export async function clearWritingCache(userId: string) {
  await Promise.all(
    [...storyQueues.entries()]
      .filter(([key]) => key.startsWith("story:" + userId + ":"))
      .map(([, promise]) => promise),
  );
  const keys = await AsyncStorage.getAllKeys();
  const owned = keys.filter(
    (key) =>
      key.startsWith("@capitulando:") &&
      /(?:entries_cache|recovery)_v\d+:/.test(key) &&
      key.includes(":" + userId + ":"),
  );
  if (owned.length) await AsyncStorage.multiRemove(owned);
  recoveryVersions.delete(userId);
  recoveryBlocked.delete(userId);
}

export async function forgetCachedChapter(
  userId: string,
  storyId: string,
  itemId: string,
) {
  await runStorySerialized(userId, storyId, async () => {
    const entries = await readCacheUnlocked(userId, storyId);
    await writeCacheUnlocked(userId, storyId, {
      chapters: entries.chapters.filter((c) => c.id !== itemId),
      drafts: entries.drafts.filter((c) => c.id !== itemId),
    });
    for (const key of [
      getRecoveryKey(userId, storyId),
      `@capitulando:recovery_v3:${userId}:${storyId}`,
    ]) {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const recovery = JSON.parse(raw) as WritingRecoveryState;
        if (recovery.itemId === itemId)
          await AsyncStorage.setItem(
            key,
            JSON.stringify({
              ...recovery,
              itemId: null,
              version: 0,
              kind: "draft",
              status: "draft",
            }),
          );
      }
    }
  });
}
