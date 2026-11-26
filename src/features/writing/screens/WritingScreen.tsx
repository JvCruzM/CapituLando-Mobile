import { ChapterListModal } from "../components/ChapterListModal";
import { ChapterConflictModal } from "../components/ChapterConflictModal";
import { RichTextEditor } from "../components/RichTextEditor";
import { plainText } from "../components/editor-content";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Share,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  Feather,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Type,
  Clock,
  FileText,
  FileDown,
  Sliders,
  Send,
  FolderOpen,
  PlusCircle,
  RefreshCw,
  Share2,
  RotateCcw,
  BookOpen,
} from "lucide-react-native";
import type {
  FontChoice,
  SpacingChoice,
  WritingEntry,
  WritingItemKind,
  WritingItemStatus,
  FormattingAction,
  WritingRecoveryState,
  WritingSessionConflict,
  WritingStorySummary,
} from "../types";
import {
  clearLocalRecovery,
  fetchSingleEntryFromApi,
  deleteEntryFromStory,
  countWords,
  getStatusLabel,
  detectRecoveryConflict,
  fetchEntriesFromApi,
  fetchRemoteRecoveryFromApi,
  loadLocalRecovery,
  readCachedEntries,
  saveEntryWithVersionControl,
  saveLocalRecovery,
  syncRemoteRecoveryToApi,
  type WritingApiConfig,
} from "../writing-store";
import { useTheme, Dialog, Portal } from "react-native-paper";
import { Button } from "../../../shared/components/Controls";
import { useAuthStore } from "../../auth/session";
import { exportWritingAsPdf, exportWritingAsTxt } from "../export-writing";
import { SessionConflictModal } from "../components/SessionConflictModal";

interface WritingScreenProps {
  initialItemId?: string;
  initialMode?: "read" | "edit";
  userId: string;
  storyId: string;
  stories?: WritingStorySummary[];
  onSelectStory?: (nextStoryId: string) => void;
  apiBaseUrl?: string;
  authToken?: string | null;
  remoteRecovery?: WritingRecoveryState | null;
  onRemoteRecoveryChange?: (next: WritingRecoveryState | null) => void;
  onDataChanged?: () => void;
}

export function WritingScreen({
  initialItemId,
  initialMode = "read",
  userId,
  storyId,
  stories = [],
  onSelectStory,
  apiBaseUrl,
  authToken = null,
  remoteRecovery = null,
  onRemoteRecoveryChange,
  onDataChanged,
}: WritingScreenProps) {
  const isDark = useTheme().dark;
  const sessionIdRef = useRef(useAuthStore.getState().session?.sessionId ?? "");
  const hydratedRef = useRef(false);
  const [hydrating, setHydrating] = useState(true);
  const [resolving, setResolving] = useState(false);

  const remoteRecoveryPropRef = useRef(remoteRecovery);
  remoteRecoveryPropRef.current = remoteRecovery;

  const onRemoteRecoveryChangeRef = useRef(onRemoteRecoveryChange);
  onRemoteRecoveryChangeRef.current = onRemoteRecoveryChange;

  const apiConfig: WritingApiConfig = useMemo(
    () => ({
      baseUrl: apiBaseUrl,
      token: authToken,
      userId,
      sessionId: sessionIdRef.current,
      storyId,
    }),
    [apiBaseUrl, authToken, userId, storyId],
  );

  const [status, setStatus] = useState<WritingItemStatus>("in_review");
  const [command, setCommand] = useState<{
    id: number;
    action: FormattingAction;
  }>();
  const [exporting, setExporting] = useState<"txt" | "pdf" | null>(null);
  const [kind, setKind] = useState<WritingItemKind>("chapter");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVersion, setEditingVersion] = useState<number | undefined>(
    undefined,
  );
  const [title, setTitle] = useState("Novo Capítulo");
  const [content, setContent] = useState("");

  const liveEditorRef = useRef({
    title: "Novo Capítulo",
    content: "",
    kind: "chapter" as WritingItemKind,
    status: "in_review" as WritingItemStatus,
  });
  useEffect(() => {
    liveEditorRef.current = { title, content, kind, status };
  }, [title, content, kind, status]);

  const [chapters, setChapters] = useState<WritingEntry[]>([]);
  const [drafts, setDrafts] = useState<WritingEntry[]>([]);
  const [showList, setShowList] = useState(false);
  const [readingEntry, setReadingEntry] = useState<WritingEntry | null>(null);
  const initialOpened = useRef<string | null>(null);

  const [isSaved, setIsSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFocus, setIsFocus] = useState(false);
  const [showTypography, setShowTypography] = useState(false);
  const [recoveryBanner, setRecoveryBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [chapterConflict, setChapterConflict] = useState<WritingEntry | null>(
    null,
  );
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [loadingConflict, setLoadingConflict] = useState(false);
  const [conflictSaved, setConflictSaved] = useState<WritingEntry | null>(null);
  const [conflict, setConflict] = useState<WritingSessionConflict | null>(null);

  useEffect(() => {
    if (conflict || chapterConflict) {
      setShowList(false);
      setReadingEntry(null);
      setPendingAction(null);
    }
  }, [conflict, chapterConflict]);

  const [font, setFont] = useState<FontChoice>("serif");
  const [fontSize, setFontSize] = useState(18);
  const [spacing, setSpacing] = useState<SpacingChoice>("relaxed");
  const [indent, setIndent] = useState(true);

  const presentRecoveryConflict = async (next: WritingSessionConflict) => {
    setLoadingConflict(true);
    setChapterConflict(null);
    setConflict(next);
    setConflictSaved(null);
    try {
      const entries = await fetchEntriesFromApi(apiConfig, storyId);
      setChapters(entries.chapters);
      setDrafts(entries.drafts);
      setConflictSaved(
        [...entries.chapters, ...entries.drafts].find(
          (c) => c.id === (next.local.itemId || next.remote.itemId),
        ) ?? null,
      );
    } catch (e) {
      setErrorBanner(
        e instanceof Error ? e.message : "Falha ao buscar capítulo salvo.",
      );
    } finally {
      setLoadingConflict(false);
    }
  };
  const applyRecovery = useCallback((state: WritingRecoveryState) => {
    setKind(state.kind);
    setStatus(state.status);
    setEditingId(state.itemId);
    setEditingVersion(state.version);
    setTitle(state.title);
    setContent(state.content);
    setIsSaved(false);
  }, []);

  useEffect(() => {
    let active = true;
    hydratedRef.current = false;
    setHydrating(true);
    setKind("chapter");
    setStatus("in_review");
    setChapterConflict(null);
    setPendingAction(null);
    setEditingId(null);
    setEditingVersion(undefined);
    setTitle("Novo Capítulo");
    setContent("");
    setIsSaved(true);
    setRecoveryBanner(null);
    setErrorBanner(null);
    setConflict(null);

    async function init() {
      const cached = await readCachedEntries(userId, storyId);
      if (active) {
        setChapters(cached.chapters);
        setDrafts(cached.drafts);
      }

      if (apiConfig.baseUrl) {
        try {
          const remoteItems = await fetchEntriesFromApi(apiConfig, storyId);
          if (active) {
            setChapters(remoteItems.chapters);
            setDrafts(remoteItems.drafts);
          }
        } catch (err) {
          if (active) {
            setErrorBanner(
              err instanceof Error
                ? err.message
                : "Falha ao sincronizar itens com o servidor. Exibindo cache local.",
            );
          }
        }
      }

      const local = await loadLocalRecovery(userId, storyId);
      let serverRecovery: WritingRecoveryState | null =
        remoteRecoveryPropRef.current;

      if (apiConfig.baseUrl) {
        try {
          const fetched = await fetchRemoteRecoveryFromApi(apiConfig, storyId);
          if (fetched) serverRecovery = fetched;
        } catch {
          // Mantém valor inicial se offline
        }
      }

      if (!active) return;

      const detected = detectRecoveryConflict(
        local,
        serverRecovery,
        sessionIdRef.current,
      );

      if (detected) {
        await presentRecoveryConflict(detected);
      } else if (
        local &&
        (local.content.trim() || local.title !== "Novo Capítulo")
      ) {
        applyRecovery(local);
        setRecoveryBanner("Rascunho recuperado do armazenamento local.");
      } else if (
        serverRecovery &&
        (serverRecovery.content.trim() ||
          serverRecovery.title !== "Novo Capítulo")
      ) {
        applyRecovery(serverRecovery);
        await saveLocalRecovery(userId, storyId, serverRecovery);
        setRecoveryBanner("Rascunho recuperado da sessão remota.");
      }

      hydratedRef.current = true;
      setHydrating(false);
    }

    void init().catch((err) => {
      if (active) {
        setHydrating(false);
        setErrorBanner(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar a escrita.",
        );
      }
    });
    return () => {
      active = false;
    };
  }, [apiConfig, applyRecovery, storyId, userId]);

  useEffect(() => {
    if (
      !hydratedRef.current ||
      isSaved ||
      saving ||
      conflict ||
      chapterConflict
    )
      return;

    const snapshot: WritingRecoveryState = {
      storyId,
      itemId: editingId,
      kind,
      status,
      title,
      content,
      version: editingVersion ?? 0,
      sessionId: sessionIdRef.current,
      updatedAt: new Date().toISOString(),
    };

    void saveLocalRecovery(userId, storyId, snapshot).catch((e) =>
      setErrorBanner(e.message),
    );
    onRemoteRecoveryChangeRef.current?.(snapshot);

    if (!apiConfig.baseUrl) return;
    const timer = setTimeout(() => {
      void syncRemoteRecoveryToApi(apiConfig, snapshot, false).catch(
        (err: unknown) => {
          const e = err as {
            code?: string;
            remoteConflict?: WritingRecoveryState;
          };
          if (e?.code === "SESSION_CONFLICT" && e.remoteConflict) {
            void presentRecoveryConflict({
              local: snapshot,
              remote: e.remoteConflict,
            });
          } else {
            setErrorBanner(
              err instanceof Error
                ? err.message
                : "Falha ao sincronizar recuperação.",
            );
          }
        },
      );
    }, 350);

    return () => clearTimeout(timer);
  }, [
    apiConfig,
    conflict,
    chapterConflict,
    content,
    editingId,
    editingVersion,
    isSaved,
    kind,
    status,
    saving,
    storyId,
    title,
    userId,
  ]);

  const handleResolveConflict = async (
    choice: "local" | "remote" | "merge" | "save_as_draft",
  ) => {
    if (!conflict || resolving || loadingConflict) return;
    setResolving(true);
    setErrorBanner(null);
    try {
      const adopt = async (state: WritingRecoveryState) => {
        const entries = await fetchEntriesFromApi(apiConfig, storyId);
        const saved = [...entries.chapters, ...entries.drafts].find(
          (c) => c.id === state.itemId,
        );
        const selected = {
          ...state,
          version: saved?.version ?? state.version,
          sessionId: sessionIdRef.current,
        };
        await syncRemoteRecoveryToApi(apiConfig, selected, true);
        applyRecovery(selected);
        await saveLocalRecovery(userId, storyId, selected);
        onRemoteRecoveryChangeRef.current?.(selected);
      };
      if (choice === "save_as_draft") {
        await saveCopy(conflict.local.title, conflict.local.content);
      } else if (choice === "local") {
        const updatedLocal = {
          ...conflict.local,
          sessionId: sessionIdRef.current,
        };
        await adopt(updatedLocal);
        setRecoveryBanner("Conflito resolvido: versão atual mantida.");
      } else if (choice === "remote") {
        if (
          conflict.remote.storyId !== storyId &&
          stories.some((s) => s.id === conflict.remote.storyId)
        ) {
          await saveLocalRecovery(
            userId,
            conflict.remote.storyId,
            conflict.remote,
          );
          setConflict(null);
          onSelectStory?.(conflict.remote.storyId);
          return;
        }
        await adopt(conflict.remote);
        setRecoveryBanner(
          "Conflito resolvido: versão da outra sessão aplicada.",
        );
      } else {
        const mergedText = [
          conflict.local.content.trim(),
          "--- Outra Sessão ---",
          conflict.remote.content.trim(),
        ]
          .filter(Boolean)
          .join("\n\n");

        const merged: WritingRecoveryState = {
          ...conflict.local,
          content: mergedText,
          sessionId: sessionIdRef.current,
          updatedAt: new Date().toISOString(),
        };
        await adopt(merged);
        setRecoveryBanner("Conflito resolvido: versões mescladas.");
      }

      setConflict(null);
    } catch (error) {
      setErrorBanner(
        error instanceof Error
          ? error.message
          : "Não foi possível resolver o conflito.",
      );
    } finally {
      setResolving(false);
    }
  };

  const handleSaveEntry = async (forceOverwrite = false) => {
    if (saving || conflict || resolving) return;
    setSaving(true);
    setErrorBanner(null);

    const sentTitle = liveEditorRef.current.title;
    const sentContent = liveEditorRef.current.content;
    const sentKind = liveEditorRef.current.kind;
    const sentStatus = liveEditorRef.current.status;
    const sentId = editingId;

    try {
      await syncRemoteRecoveryToApi(
        apiConfig,
        {
          storyId,
          itemId: sentId,
          kind: sentKind,
          status: sentStatus,
          title: sentTitle,
          content: sentContent,
          version: editingVersion ?? 0,
          sessionId: sessionIdRef.current,
          updatedAt: new Date().toISOString(),
        },
        false,
      );
      const { saved, storyEntries } = await saveEntryWithVersionControl(
        apiConfig,
        {
          id: sentId,
          storyId,
          title: sentTitle,
          content: sentContent,
          kind: sentKind,
          status: sentStatus,
          expectedVersion: editingVersion,
          forceOverwrite,
        },
      );

      setChapters(storyEntries.chapters);
      setDrafts(storyEntries.drafts);
      onDataChanged?.();

      const stillMatchesSent =
        liveEditorRef.current.title === sentTitle &&
        liveEditorRef.current.content === sentContent &&
        liveEditorRef.current.kind === sentKind &&
        liveEditorRef.current.status === sentStatus;

      if (stillMatchesSent) {
        setEditingId(saved.id);
        setEditingVersion(saved.version);
        setKind(saved.kind);
        setStatus(saved.status);
        setIsSaved(true);
        setRecoveryBanner(null);
        await clearLocalRecovery(userId, storyId);
        if (apiConfig.baseUrl) {
          await syncRemoteRecoveryToApi(apiConfig, null, false);
        }
        onRemoteRecoveryChangeRef.current?.(null);
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 2000);
      } else {
        setEditingId(saved.id);
        setEditingVersion(saved.version);
        setIsSaved(false);
        const newestSnapshot: WritingRecoveryState = {
          storyId,
          itemId: saved.id,
          kind: liveEditorRef.current.kind,
          status: liveEditorRef.current.status,
          title: liveEditorRef.current.title,
          content: liveEditorRef.current.content,
          version: saved.version,
          sessionId: sessionIdRef.current,
          updatedAt: new Date().toISOString(),
        };
        await saveLocalRecovery(userId, storyId, newestSnapshot);
        onRemoteRecoveryChangeRef.current?.(newestSnapshot);
      }
      setChapterConflict(null);
    } catch (err: unknown) {
      const e = err as {
        code?: string;
        message?: string;
        serverEntry?: WritingEntry;
        remoteConflict?: WritingRecoveryState;
      };
      if (e?.code === "SESSION_CONFLICT" && e.remoteConflict) {
        await presentRecoveryConflict({
          local: {
            storyId,
            itemId: sentId,
            kind: sentKind,
            status: sentStatus,
            title: sentTitle,
            content: sentContent,
            version: editingVersion ?? 0,
            sessionId: sessionIdRef.current,
            updatedAt: new Date().toISOString(),
          },
          remote: e.remoteConflict,
        });
      } else if (e?.code === "VERSION_CONFLICT" && e.serverEntry) {
        setChapterConflict(e.serverEntry);
      } else {
        setErrorBanner(e?.message || "Não foi possível salvar.");
      }
    } finally {
      setSaving(false);
    }
  };

  const saveCopy = async (copyTitle = title, copyContent = content) => {
    if (saving) return;
    setSaving(true);
    try {
      const { saved, storyEntries } = await saveEntryWithVersionControl(
        apiConfig,
        {
          id: null,
          storyId,
          title: (copyTitle.trim() || "Sem Título") + " (Rascunho)",
          content: copyContent,
          kind: "draft",
          status: "draft",
        },
      );
      setChapters(storyEntries.chapters);
      setDrafts(storyEntries.drafts);
      applyRecovery({
        ...saved,
        itemId: saved.id,
        sessionId: sessionIdRef.current,
      });
      setIsSaved(true);
      setChapterConflict(null);
      await clearLocalRecovery(userId, storyId);
      // Uma cópia não descarta a recuperação pendente da outra sessão.
      onDataChanged?.();
      setRecoveryBanner("Cópia salva como novo rascunho.");
    } finally {
      setSaving(false);
    }
  };
  const exportFile = async (format: "txt" | "pdf") => {
    if (exporting) return;
    setExporting(format);
    setErrorBanner(null);
    try {
      if (format === "txt") await exportWritingAsTxt(title, content);
      else
        await exportWritingAsPdf(
          title,
          content,
          stories.find((s) => s.id === storyId)?.title,
        );
    } catch (e) {
      setErrorBanner(
        e instanceof Error ? e.message : "Falha ao exportar arquivo.",
      );
    } finally {
      setExporting(null);
    }
  };
  const clearRecovery = async () => {
    try {
      await clearLocalRecovery(userId, storyId);
      if (apiConfig.baseUrl)
        await syncRemoteRecoveryToApi(apiConfig, null, false);
    } catch (e) {
      setErrorBanner(
        e instanceof Error
          ? e.message
          : "Não foi possível atualizar a recuperação.",
      );
    }
  };
  const confirmChange = (action: () => void) => {
    if (!isSaved) setPendingAction(() => action);
    else action();
  };

  const openInEditor = (entry: WritingEntry) => {
    setShowList(false);
    setReadingEntry(null);
    if (entry.id === editingId) return;
    confirmChange(() => {
      setKind(entry.kind);
      setStatus(entry.status);
      setEditingId(entry.id);
      setEditingVersion(entry.version);
      setTitle(entry.title);
      setContent(entry.content);
      setIsSaved(true);
      void clearRecovery().catch((e) => setErrorBanner(e.message));
    });
  };
  useEffect(() => {
    if (
      !initialItemId ||
      hydrating ||
      conflict ||
      chapterConflict ||
      initialOpened.current === initialItemId
    )
      return;
    initialOpened.current = initialItemId;
    const entry = [...chapters, ...drafts].find(
      (item) => item.id === initialItemId,
    );
    if (!entry) {
      setErrorBanner(
        "O texto solicitado não foi encontrado neste livro. Atualize a lista e tente novamente.",
      );
      return;
    }
    if (initialMode === "edit") openInEditor(entry);
    else {
      setReadingEntry(entry);
      setShowList(true);
    }
  }, [
    initialItemId,
    initialMode,
    hydrating,
    conflict,
    chapterConflict,
    chapters,
    drafts,
  ]);

  const handleDeleteEntry = async (entry: WritingEntry) => {
    setSaving(true);
    try {
      await deleteEntryFromStory(apiConfig, storyId, entry.id);
      const items = await readCachedEntries(userId, storyId);
      setChapters(items.chapters);
      setDrafts(items.drafts);
      if (entry.id === editingId) {
        setEditingId(null);
        setEditingVersion(undefined);
        setKind("draft");
        setStatus("draft");
        setIsSaved(false);
      }
      onDataChanged?.();
    } finally {
      setSaving(false);
    }
  };

  const wordCount = useMemo(() => countWords(content), [content]);
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const bgMain = isDark ? "#120e17" : "#fcf8f2";
  const bgCard = isDark ? "#1a1321" : "#fcf8f2";
  const bgChip = isDark ? "#221a2b" : "#ffffff";
  const textMain = isDark ? "#f5f5f4" : "#1c1917";
  const textMuted = isDark ? "#c6bdc9" : "#655c63";
  const accent = isDark ? "#9d174d" : "#4b1d3f";

  const lineHeight =
    spacing === "normal"
      ? Math.round(fontSize * 1.45)
      : spacing === "loose"
        ? Math.round(fontSize * 2.0)
        : Math.round(fontSize * 1.7);

  const fontStyle =
    font === "mono"
      ? {
          fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
        }
      : font === "sans"
        ? {
            fontFamily: Platform.select({
              ios: "System",
              android: "sans-serif",
            }),
          }
        : {
            fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
          };

  const activeStoryTitle =
    stories.find((s) => s.id === storyId)?.title || `Livro (${storyId})`;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bgMain }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {Boolean(errorBanner) && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorBanner}</Text>
            </View>
          )}

          {Boolean(recoveryBanner) && !isFocus && (
            <View style={[styles.banner, { backgroundColor: bgCard }]}>
              <RotateCcw size={15} color={accent} />
              <Text style={[styles.bannerText, { color: textMain }]}>
                {recoveryBanner}
              </Text>
            </View>
          )}

          {!isFocus && (
            <View style={[styles.card, { backgroundColor: bgCard }]}>
              <View style={styles.topRow}>
                <Feather size={20} color={accent} />
                <View style={styles.flex}>
                  <Text style={[styles.heading, { color: textMain }]}>
                    Espaço de Escrita
                  </Text>
                  <Text style={[styles.subInfo, { color: textMuted }]}>
                    {activeStoryTitle}
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: saving
                        ? "#e0e7ff"
                        : isSaved
                          ? "#dcfce7"
                          : "#fef3c7",
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: saving
                        ? "#3730a3"
                        : isSaved
                          ? "#166534"
                          : "#92400e",
                    }}
                  >
                    {hydrating
                      ? "Carregando..."
                      : saving
                        ? "Salvando..."
                        : isSaved
                          ? "Salvo"
                          : "Não salvo"}
                  </Text>
                </View>
              </View>

              {stories.length > 1 && onSelectStory && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.row}>
                    {stories.map((s) => {
                      const selected = s.id === storyId;
                      return (
                        <TouchableOpacity
                          key={s.id}
                          disabled={saving || hydrating}
                          style={[
                            styles.chipBtn,
                            { backgroundColor: selected ? accent : bgChip },
                          ]}
                          onPress={() => {
                            if (s.id !== storyId)
                              confirmChange(() => onSelectStory(s.id));
                          }}
                        >
                          <BookOpen
                            size={13}
                            color={selected ? "#fff" : accent}
                          />
                          <Text
                            style={[
                              styles.chipLabel,
                              { color: selected ? "#fff" : textMain },
                            ]}
                          >
                            {s.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              )}

              <View style={styles.row}>
                <View style={[styles.segment, { backgroundColor: bgChip }]}>
                  <TouchableOpacity
                    disabled={saving || hydrating}
                    style={[
                      styles.segBtn,
                      kind === "chapter" && { backgroundColor: accent },
                    ]}
                    onPress={() => {
                      setKind("chapter");
                      setStatus("in_review");
                      setIsSaved(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.segLabel,
                        { color: kind === "chapter" ? "#fff" : textMuted },
                      ]}
                    >
                      Capítulos ({chapters.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={saving || hydrating}
                    style={[
                      styles.segBtn,
                      kind === "draft" && { backgroundColor: accent },
                    ]}
                    onPress={() => {
                      setKind("draft");
                      setStatus("draft");
                      setIsSaved(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.segLabel,
                        { color: kind === "draft" ? "#fff" : textMuted },
                      ]}
                    >
                      Rascunhos ({drafts.length})
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  disabled={saving || hydrating}
                  style={[styles.chipBtn, { backgroundColor: bgChip }]}
                  onPress={() => setShowList((prev) => !prev)}
                >
                  <FolderOpen size={15} color={accent} />
                  <Text style={[styles.chipLabel, { color: textMain }]}>
                    Abrir
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={saving || hydrating}
                  style={[styles.chipBtn, { backgroundColor: bgChip }]}
                  onPress={() =>
                    confirmChange(() => {
                      setEditingId(null);
                      setEditingVersion(undefined);
                      setTitle(
                        kind === "chapter" ? "Novo Capítulo" : "Novo Rascunho",
                      );
                      setContent("");
                      setIsSaved(true);
                      void clearRecovery();
                    })
                  }
                >
                  <PlusCircle size={15} color={textMain} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    {
                      backgroundColor: savedToast ? "#15803d" : accent,
                      opacity: saving ? 0.65 : 1,
                    },
                  ]}
                  disabled={saving || hydrating}
                  onPress={() => void handleSaveEntry(false)}
                >
                  {savedToast ? (
                    <Check size={15} color="#fff" />
                  ) : editingId ? (
                    <RefreshCw size={15} color="#fff" />
                  ) : (
                    <Send size={15} color="#fff" />
                  )}
                  <Text style={styles.saveLabel}>
                    {saving
                      ? "Salvando"
                      : savedToast
                        ? "Salvo"
                        : editingId
                          ? "Atualizar"
                          : "Salvar"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!isFocus && (
            <View style={styles.row}>
              {(
                [
                  "draft",
                  "in_review",
                  "published",
                  "archived",
                ] as WritingItemStatus[]
              ).map((value) => (
                <Button
                  key={value}
                  disabled={saving || hydrating}
                  mode={status === value ? "contained" : "outlined"}
                  onPress={() => {
                    setStatus(value);
                    setKind(value === "draft" ? "draft" : "chapter");
                    setIsSaved(false);
                  }}
                >
                  {getStatusLabel(value)}
                </Button>
              ))}
            </View>
          )}
          <ScrollView horizontal>
            <View style={styles.row}>
              {(
                [
                  "bold",
                  "italic",
                  "underline",
                  "h1",
                  "h2",
                  "quote",
                  "list",
                ] as FormattingAction[]
              ).map((action, i) => (
                <Button
                  key={action}
                  disabled={saving || hydrating}
                  onPress={() =>
                    setCommand((previous) => ({
                      id: (previous?.id ?? 0) + 1,
                      action,
                    }))
                  }
                >
                  {
                    [
                      "Negrito",
                      "Itálico",
                      "Sublinhado",
                      "Título H1",
                      "Título H2",
                      "Citação",
                      "Lista",
                    ][i]
                  }
                </Button>
              ))}
            </View>
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[styles.row, { flexWrap: "nowrap" }]}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Exportar TXT"
                accessibilityState={{
                  disabled: Boolean(exporting) || hydrating,
                  busy: exporting === "txt",
                }}
                style={[
                  styles.chipBtn,
                  {
                    backgroundColor: bgCard,
                    opacity: exporting || hydrating ? 0.55 : 1,
                  },
                ]}
                disabled={Boolean(exporting) || hydrating}
                onPress={() => void exportFile("txt")}
              >
                {exporting === "txt" ? (
                  <ActivityIndicator size={14} color={textMain} />
                ) : (
                  <FileText size={14} color={textMain} />
                )}
                <Text style={[styles.chipLabel, { color: textMain }]}>TXT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Exportar PDF"
                accessibilityState={{
                  disabled: Boolean(exporting) || hydrating,
                  busy: exporting === "pdf",
                }}
                style={[
                  styles.chipBtn,
                  {
                    backgroundColor: bgCard,
                    opacity: exporting || hydrating ? 0.55 : 1,
                  },
                ]}
                disabled={Boolean(exporting) || hydrating}
                onPress={() => void exportFile("pdf")}
              >
                {exporting === "pdf" ? (
                  <ActivityIndicator size={14} color={textMain} />
                ) : (
                  <FileDown size={14} color={textMain} />
                )}
                <Text style={[styles.chipLabel, { color: textMain }]}>PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chipBtn, { backgroundColor: bgCard }]}
                onPress={() => setShowTypography((prev) => !prev)}
              >
                <Sliders size={14} color={textMain} />
                <Text style={[styles.chipLabel, { color: textMain }]}>
                  Tipografia
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chipBtn, { backgroundColor: bgCard }]}
                onPress={async () => {
                  await Clipboard.setStringAsync(
                    `${title}\n\n${plainText(content)}`,
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }}
              >
                {copied ? (
                  <Check size={14} color="#16a34a" />
                ) : (
                  <Copy size={14} color={textMain} />
                )}
                <Text style={[styles.chipLabel, { color: textMain }]}>
                  {copied ? "Copiado" : "Copiar"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chipBtn, { backgroundColor: bgCard }]}
                onPress={() =>
                  void Share.share({
                    title,
                    message: `${title}\n\n${plainText(content)}`,
                  })
                }
              >
                <Share2 size={14} color={textMain} />
                <Text style={[styles.chipLabel, { color: textMain }]}>
                  Compartilhar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chipBtn, { backgroundColor: bgCard }]}
                onPress={() => setIsFocus((prev) => !prev)}
              >
                {isFocus ? (
                  <Minimize2 size={14} color={accent} />
                ) : (
                  <Maximize2 size={14} color={accent} />
                )}
                <Text style={[styles.chipLabel, { color: accent }]}>
                  {isFocus ? "Sair do Foco" : "Modo Foco"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {showTypography && (
            <View style={[styles.card, { backgroundColor: bgCard }]}>
              <View style={styles.row}>
                {(["serif", "sans", "mono"] as const).map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.chipBtn,
                      { backgroundColor: font === f ? accent : bgChip },
                    ]}
                    onPress={() => setFont(f)}
                  >
                    <Text
                      style={{
                        color: font === f ? "#fff" : textMain,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.chipBtn,
                    { backgroundColor: indent ? accent : bgChip },
                  ]}
                  onPress={() => setIndent((prev) => !prev)}
                >
                  <Text
                    style={{
                      color: indent ? "#fff" : textMain,
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    Recuo
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.row}>
                {[16, 18, 22].map((sz) => (
                  <TouchableOpacity
                    key={sz}
                    style={[
                      styles.chipBtn,
                      { backgroundColor: fontSize === sz ? accent : bgChip },
                    ]}
                    onPress={() => setFontSize(sz)}
                  >
                    <Text
                      style={{
                        color: fontSize === sz ? "#fff" : textMain,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {sz}px
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.chipBtn, { backgroundColor: bgChip }]}
                  onPress={() =>
                    setSpacing((prev) =>
                      prev === "normal"
                        ? "relaxed"
                        : prev === "relaxed"
                          ? "loose"
                          : "normal",
                    )
                  }
                >
                  <Text
                    style={{
                      color: textMain,
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    Espaço: {spacing}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={[styles.editorCard, { backgroundColor: bgCard }]}>
            <TextInput
              value={title}
              editable={!saving && !hydrating}
              onChangeText={(t) => {
                setTitle(t);
                setIsSaved(false);
              }}
              placeholder="Título..."
              placeholderTextColor={textMuted}
              style={[
                styles.titleInput,
                { color: textMain, opacity: saving ? 0.7 : 1 },
              ]}
            />

            <RichTextEditor
              command={command}
              value={content}
              disabled={saving || hydrating}
              onChange={(html) => {
                setContent(html);
                setIsSaved(false);
              }}
              color={textMain}
              background={bgCard}
              fontSize={fontSize}
              lineHeight={lineHeight}
              fontFamily={fontStyle.fontFamily}
              indent={indent}
            />

            <View style={styles.footer}>
              <View style={styles.row}>
                <FileText size={14} color={accent} />
                <Text style={{ color: textMuted, fontSize: 12 }}>
                  {wordCount} palavras
                </Text>
                <Type size={14} color={accent} />
                <Text style={{ color: textMuted, fontSize: 12 }}>
                  {plainText(content).length} caracteres
                </Text>
              </View>
              <View style={styles.row}>
                <Clock size={14} color={textMuted} />
                <Text style={{ color: textMuted, fontSize: 12 }}>
                  ~{readingMinutes} min
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ChapterListModal
        visible={showList}
        kind={readingEntry?.kind ?? kind}
        entries={(readingEntry?.kind ?? kind) === "chapter" ? chapters : drafts}
        initialEntry={readingEntry}
        isDark={isDark}
        disabled={
          saving || hydrating || Boolean(conflict) || Boolean(chapterConflict)
        }
        onClose={() => {
          setShowList(false);
          setReadingEntry(null);
        }}
        onLoadEntry={async (entry) => {
          const fresh = await fetchSingleEntryFromApi(
            apiConfig,
            storyId,
            entry.id,
          );
          const items = await readCachedEntries(userId, storyId);
          setChapters(items.chapters);
          setDrafts(items.drafts);
          return fresh;
        }}
        onOpenInEditor={openInEditor}
        onDeleteEntry={handleDeleteEntry}
      />
      <Portal>
        <Dialog
          visible={Boolean(pendingAction)}
          onDismiss={() => setPendingAction(null)}
        >
          <Dialog.Title>Descartar alterações?</Dialog.Title>
          <Dialog.Content>
            <Text>
              Salve o texto atual antes de abrir outro capítulo ou criar um
              novo. Continuar descarta as alterações deste editor.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={{ flexWrap: "wrap" }}>
            <Button onPress={() => setPendingAction(null)}>Cancelar</Button>
            <Button
              onPress={() => {
                const action = pendingAction;
                setPendingAction(null);
                action?.();
              }}
            >
              Descartar e continuar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <ChapterConflictModal
        chapter={conflict ? null : chapterConflict}
        isDark={isDark}
        busy={saving}
        error={errorBanner}
        onDismiss={() => setChapterConflict(null)}
        onLoadServer={() => {
          if (!chapterConflict) return;
          applyRecovery({
            ...chapterConflict,
            itemId: chapterConflict.id,
            sessionId: sessionIdRef.current,
          });
          setIsSaved(true);
          setChapterConflict(null);
          void clearRecovery();
        }}
        onSaveCopy={() =>
          void saveCopy().catch((e) => setErrorBanner(e.message))
        }
        onOverwrite={() => void handleSaveEntry(true)}
      />
      <SessionConflictModal
        conflict={conflict}
        savedChapter={conflictSaved}
        busy={resolving || loadingConflict}
        error={errorBanner}
        isDark={isDark}
        onResolve={(choice) => void handleResolveConflict(choice)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 14, gap: 10 },
  errorBox: {
    backgroundColor: "#fee2e2",
    padding: 12,
    borderRadius: 14,
  },
  errorText: {
    color: "#991b1b",
    fontSize: 12,
    fontWeight: "700",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 16,
  },
  bannerText: { fontSize: 12, fontWeight: "600", flex: 1 },
  card: { borderRadius: 22, padding: 14, gap: 10 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  heading: { fontSize: 17, fontWeight: "700" },
  subInfo: { fontSize: 11, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  segment: { flexDirection: "row", borderRadius: 12, padding: 3 },
  segBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
  segLabel: { fontSize: 11, fontWeight: "700" },
  chipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
  },
  chipLabel: { fontSize: 12, fontWeight: "600" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveLabel: { color: "#fff", fontSize: 12, fontWeight: "700" },
  editorCard: { borderRadius: 22, padding: 16, minHeight: 460, gap: 10 },
  titleInput: { fontSize: 22, fontWeight: "700", paddingBottom: 8 },
  bodyInput: { flex: 1, minHeight: 340 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
  },
});
