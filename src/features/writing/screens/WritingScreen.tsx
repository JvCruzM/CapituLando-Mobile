import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useColorScheme,
  Share,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  type TextInputSelectionChangeEvent,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  Feather,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Type,
  Clock,
  FileText,
  Sliders,
  Send,
  FolderOpen,
  PlusCircle,
  RefreshCw,
  Share2,
  RotateCcw,
  BookOpen,
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Quote,
  List,
  Download,
} from 'lucide-react-native';
import type {
  FontChoice,
  FormattingAction,
  SpacingChoice,
  WritingEntry,
  WritingItemKind,
  WritingItemStatus,
  WritingRecoveryState,
  WritingSessionConflict,
  WritingStorySummary,
} from '../types';
import {
  applyFormattingToSelection,
  clearLocalRecovery,
  countWords,
  deleteEntryFromStory,
  detectRecoveryConflict,
  fetchEntriesFromApi,
  fetchRemoteRecoveryFromApi,
  fetchSingleEntryFromApi,
  getStatusLabel,
  loadLocalRecovery,
  readCachedEntries,
  saveEntryWithVersionControl,
  saveLocalRecovery,
  syncRemoteRecoveryToApi,
  type WritingApiConfig,
} from '../writing-store';
import { exportWritingAsPdf, exportWritingAsTxt } from '../export-writing';
import {
  SessionConflictModal,
  type ConflictResolutionChoice,
} from '../components/SessionConflictModal';
import { ChapterListModal } from '../components/ChapterListModal';

const STATUS_OPTIONS: WritingItemStatus[] = [
  'draft',
  'in_review',
  'published',
  'archived',
];

interface WritingScreenProps {
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
  const isDark = useColorScheme() === 'dark';
  const sessionIdRef = useRef(
    `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  );
  const hydratedRef = useRef(false);
  const bodyInputRef = useRef<React.ComponentRef<typeof TextInput> | null>(null);

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
    }),
    [apiBaseUrl, authToken, userId],
  );

  const [kind, setKind] = useState<WritingItemKind>('chapter');
  const [status, setStatus] = useState<WritingItemStatus>('in_review');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVersion, setEditingVersion] = useState<number | undefined>(
    undefined,
  );
  const [title, setTitle] = useState('Novo Capítulo');
  const [content, setContent] = useState('');
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const liveEditorRef = useRef({
    title: 'Novo Capítulo',
    content: '',
    kind: 'chapter' as WritingItemKind,
    status: 'in_review' as WritingItemStatus,
  });
  useEffect(() => {
    liveEditorRef.current = { title, content, kind, status };
  }, [title, content, kind, status]);

  const [chapters, setChapters] = useState<WritingEntry[]>([]);
  const [drafts, setDrafts] = useState<WritingEntry[]>([]);
  const [showList, setShowList] = useState(false);

  const [isSaved, setIsSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<'txt' | 'pdf' | null>(null);
  const [savedToast, setSavedToast] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFocus, setIsFocus] = useState(false);
  const [showTypography, setShowTypography] = useState(false);
  const [recoveryBanner, setRecoveryBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [conflict, setConflict] = useState<WritingSessionConflict | null>(null);

  const [font, setFont] = useState<FontChoice>('serif');
  const [fontSize, setFontSize] = useState(18);
  const [spacing, setSpacing] = useState<SpacingChoice>('relaxed');
  const [indent, setIndent] = useState(true);

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
    setEditingId(null);
    setEditingVersion(undefined);
    setKind('chapter');
    setStatus('in_review');
    setTitle('Novo Capítulo');
    setContent('');
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
                : 'Falha ao sincronizar itens com o servidor. Exibindo cache local.',
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
        setConflict(detected);
      } else if (
        local &&
        (local.content.trim() || local.title !== 'Novo Capítulo')
      ) {
        applyRecovery(local);
        setRecoveryBanner('Rascunho recuperado do armazenamento local.');
      } else if (
        serverRecovery &&
        (serverRecovery.content.trim() ||
          serverRecovery.title !== 'Novo Capítulo')
      ) {
        applyRecovery(serverRecovery);
        await saveLocalRecovery(userId, storyId, serverRecovery);
        setRecoveryBanner('Rascunho recuperado da sessão remota.');
      }

      hydratedRef.current = true;
    }

    void init();
    return () => {
      active = false;
    };
  }, [apiConfig, applyRecovery, storyId, userId]);

  useEffect(() => {
    if (!hydratedRef.current || isSaved || saving) return;

    const snapshot: WritingRecoveryState = {
      storyId,
      itemId: editingId,
      kind,
      status,
      title,
      content,
      version: (editingVersion ?? 0) + 1,
      sessionId: sessionIdRef.current,
      updatedAt: new Date().toISOString(),
    };

    void saveLocalRecovery(userId, storyId, snapshot);
    onRemoteRecoveryChangeRef.current?.(snapshot);

    if (!apiConfig.baseUrl) return;
    const timer = setTimeout(() => {
      void syncRemoteRecoveryToApi(apiConfig, snapshot, false).catch(
        (err: unknown) => {
          const e = err as {
            code?: string;
            remoteConflict?: WritingRecoveryState;
          };
          if (e?.code === 'SESSION_CONFLICT' && e.remoteConflict) {
            setConflict({ local: snapshot, remote: e.remoteConflict });
          }
        },
      );
    }, 350);

    return () => clearTimeout(timer);
  }, [
    apiConfig,
    content,
    editingId,
    editingVersion,
    isSaved,
    kind,
    saving,
    status,
    storyId,
    title,
    userId,
  ]);

  const handleSaveAsNewDraft = async (
    draftTitle: string,
    draftContent: string,
  ) => {
    const cleanDraftTitle = `${draftTitle.trim() || 'Sem Título'} (Rascunho)`;
    const { saved, storyEntries } = await saveEntryWithVersionControl(
      apiConfig,
      {
        id: null,
        storyId,
        title: cleanDraftTitle,
        content: draftContent,
        kind: 'draft',
        status: 'draft',
        forceOverwrite: true,
      },
    );

    setChapters(storyEntries.chapters);
    setDrafts(storyEntries.drafts);
    setKind('draft');
    setStatus('draft');
    setEditingId(saved.id);
    setEditingVersion(saved.version);
    setTitle(saved.title);
    setContent(saved.content);
    setIsSaved(true);
    await clearLocalRecovery(userId, storyId);
    if (apiConfig.baseUrl) {
      await syncRemoteRecoveryToApi(apiConfig, null, true).catch(() => undefined);
    }
    onRemoteRecoveryChangeRef.current?.(null);
    onDataChanged?.();
    setRecoveryBanner('Cópia salva como novo rascunho.');
  };

  const handleResolveConflict = async (choice: ConflictResolutionChoice) => {
    if (!conflict) return;

    try {
      if (choice === 'local') {
        const updatedLocal = {
          ...conflict.local,
          sessionId: sessionIdRef.current,
        };
        applyRecovery(updatedLocal);
        await saveLocalRecovery(userId, storyId, updatedLocal);
        if (apiConfig.baseUrl) {
          await syncRemoteRecoveryToApi(apiConfig, updatedLocal, true).catch(
            () => undefined,
          );
        }
        onRemoteRecoveryChangeRef.current?.(updatedLocal);
        setRecoveryBanner('Conflito resolvido: versão atual mantida.');
      } else if (choice === 'remote') {
        applyRecovery(conflict.remote);
        await saveLocalRecovery(userId, storyId, conflict.remote);
        onRemoteRecoveryChangeRef.current?.(conflict.remote);
        setRecoveryBanner('Conflito resolvido: versão da outra sessão aplicada.');
      } else if (choice === 'merge') {
        const mergedText = [
          conflict.local.content.trim(),
          '--- Outra Sessão ---',
          conflict.remote.content.trim(),
        ]
          .filter(Boolean)
          .join('\n\n');

        const merged: WritingRecoveryState = {
          ...conflict.local,
          content: mergedText,
          sessionId: sessionIdRef.current,
          updatedAt: new Date().toISOString(),
        };
        applyRecovery(merged);
        await saveLocalRecovery(userId, storyId, merged);
        if (apiConfig.baseUrl) {
          await syncRemoteRecoveryToApi(apiConfig, merged, true).catch(
            () => undefined,
          );
        }
        onRemoteRecoveryChangeRef.current?.(merged);
        setRecoveryBanner('Conflito resolvido: versões mescladas.');
      } else if (choice === 'save_as_draft') {
        await handleSaveAsNewDraft(
          conflict.local.title,
          conflict.local.content,
        );
      }
    } catch (err) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : 'Falha ao resolver conflito entre sessões.',
      );
    } finally {
      setConflict(null);
    }
  };

  const handleSaveEntry = async (forceOverwrite = false) => {
    if (saving) return;
    setSaving(true);
    setErrorBanner(null);

    const sentTitle = liveEditorRef.current.title;
    const sentContent = liveEditorRef.current.content;
    const sentKind = liveEditorRef.current.kind;
    const sentStatus = liveEditorRef.current.status;
    const sentId = editingId;

    try {
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
          await syncRemoteRecoveryToApi(apiConfig, null, true).catch(
            () => undefined,
          );
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
          version: saved.version + 1,
          sessionId: sessionIdRef.current,
          updatedAt: new Date().toISOString(),
        };
        await saveLocalRecovery(userId, storyId, newestSnapshot);
        onRemoteRecoveryChangeRef.current?.(newestSnapshot);
      }
    } catch (err: unknown) {
      const e = err as {
        code?: string;
        message?: string;
        serverEntry?: WritingEntry;
      };
      if (e?.code === 'VERSION_CONFLICT') {
        Alert.alert(
          'Conflito de versão',
          e.serverEntry
            ? `Este item já está na versão ${e.serverEntry.version} no servidor.`
            : 'Este item foi alterado em outra sessão ou dispositivo.',
          [
            ...(e.serverEntry
              ? [
                  {
                    text: 'Carregar versão do servidor',
                    onPress: () => {
                      if (!e.serverEntry) return;
                      setEditingId(e.serverEntry.id);
                      setEditingVersion(e.serverEntry.version);
                      setTitle(e.serverEntry.title);
                      setContent(e.serverEntry.content);
                      setKind(e.serverEntry.kind);
                      setStatus(e.serverEntry.status);
                      setIsSaved(true);
                    },
                  },
                ]
              : []),
            {
              text: 'Salvar cópia como novo rascunho',
              onPress: () =>
                void handleSaveAsNewDraft(sentTitle, sentContent).catch(
                  (draftErr) =>
                    setErrorBanner(
                      draftErr instanceof Error
                        ? draftErr.message
                        : 'Falha ao salvar cópia como rascunho.',
                    ),
                ),
            },
            {
              text: 'Sobrescrever servidor',
              style: 'destructive',
              onPress: () => void handleSaveEntry(true),
            },
          ],
        );
      } else {
        setErrorBanner(e?.message || 'Não foi possível salvar.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = (entry: WritingEntry) => {
    Alert.alert(
      'Excluir item',
      `Deseja realmente excluir "${entry.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const nextEntries = await deleteEntryFromStory(
                  apiConfig,
                  storyId,
                  entry.id,
                );
                setChapters(nextEntries.chapters);
                setDrafts(nextEntries.drafts);
                if (editingId === entry.id) {
                  setEditingId(null);
                  setEditingVersion(undefined);
                  setTitle(
                    kind === 'chapter' ? 'Novo Capítulo' : 'Novo Rascunho',
                  );
                  setContent('');
                  setIsSaved(true);
                }
                onDataChanged?.();
              } catch (err) {
                setErrorBanner(
                  err instanceof Error ? err.message : 'Erro ao excluir item.',
                );
              }
            })();
          },
        },
      ],
    );
  };

  const handleFormat = (action: FormattingAction) => {
    if (saving) return;
    const formatted = applyFormattingToSelection({
      content,
      selectionStart: selection.start,
      selectionEnd: selection.end,
      action,
    });
    setContent(formatted.nextContent);
    setIsSaved(false);
    setSelection({ start: formatted.nextStart, end: formatted.nextEnd });
    requestAnimationFrame(() => {
      bodyInputRef.current?.focus();
    });
  };

  const handleExportTxt = async () => {
    if (exporting) return;
    setExporting('txt');
    setErrorBanner(null);
    try {
      await exportWritingAsTxt(title, content);
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Falha ao exportar arquivo TXT.',
      );
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    if (exporting) return;
    setExporting('pdf');
    setErrorBanner(null);
    try {
      const storyTitle = stories.find((s) => s.id === storyId)?.title;
      await exportWritingAsPdf(title, content, storyTitle);
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Falha ao exportar arquivo PDF.',
      );
    } finally {
      setExporting(null);
    }
  };

  const activeList = kind === 'chapter' ? chapters : drafts;
  const wordCount = useMemo(() => countWords(content), [content]);
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const bgMain = isDark ? '#120e17' : '#f3ccde';
  const bgCard = isDark ? '#1a1120' : '#fcf8f2';
  const bgChip = isDark ? '#24172d' : '#ffffff';
  const textMain = isDark ? '#f5f5f4' : '#1c1917';
  const textMuted = isDark ? '#a8a29e' : '#57534e';
  const accent = isDark ? '#9d174d' : '#4b1d3f';

  const lineHeight =
    spacing === 'normal'
      ? Math.round(fontSize * 1.45)
      : spacing === 'loose'
        ? Math.round(fontSize * 2.0)
        : Math.round(fontSize * 1.7);

  const fontStyle =
    font === 'mono'
      ? {
          fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
        }
      : font === 'sans'
        ? {
            fontFamily: Platform.select({
              ios: 'System',
              android: 'sans-serif',
            }),
          }
        : {
            fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
          };

  const activeStoryTitle =
    stories.find((s) => s.id === storyId)?.title || `Livro (${storyId})`;

  const formatButtons: {
    action: FormattingAction;
    label: string;
    Icon: React.ComponentType<{ size?: number; color?: string }>;
  }[] = [
    { action: 'bold', label: 'Negrito', Icon: Bold },
    { action: 'italic', label: 'Itálico', Icon: Italic },
    { action: 'underline', label: 'Sublinhado', Icon: Underline },
    { action: 'h1', label: 'H1', Icon: Heading1 },
    { action: 'h2', label: 'H2', Icon: Heading2 },
    { action: 'quote', label: 'Citação', Icon: Quote },
    { action: 'list', label: 'Lista', Icon: List },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bgMain }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
                    {activeStoryTitle} · {getStatusLabel(status)} · Autor{' '}
                    {userId}
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: saving
                        ? '#e0e7ff'
                        : isSaved
                          ? '#dcfce7'
                          : '#fef3c7',
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: saving
                        ? '#3730a3'
                        : isSaved
                          ? '#166534'
                          : '#92400e',
                    }}
                  >
                    {saving ? 'Salvando...' : isSaved ? 'Salvo' : 'Não salvo'}
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
                          disabled={saving}
                          style={[
                            styles.chipBtn,
                            { backgroundColor: selected ? accent : bgChip },
                          ]}
                          onPress={() => onSelectStory(s.id)}
                        >
                          <BookOpen
                            size={13}
                            color={selected ? '#fff' : accent}
                          />
                          <Text
                            style={[
                              styles.chipLabel,
                              { color: selected ? '#fff' : textMain },
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

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.row}>
                  {STATUS_OPTIONS.map((st) => {
                    const activeSt = status === st;
                    return (
                      <TouchableOpacity
                        key={st}
                        disabled={saving}
                        style={[
                          styles.statusChip,
                          { backgroundColor: activeSt ? accent : bgChip },
                        ]}
                        onPress={() => {
                          setStatus(st);
                          if (st === 'draft') {
                            setKind('draft');
                          } else if (kind === 'draft') {
                            setKind('chapter');
                          }
                          setIsSaved(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.statusLabel,
                            { color: activeSt ? '#fff' : textMain },
                          ]}
                        >
                          {getStatusLabel(st)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={styles.row}>
                <View style={[styles.segment, { backgroundColor: bgChip }]}>
                  <TouchableOpacity
                    disabled={saving}
                    style={[
                      styles.segBtn,
                      kind === 'chapter' && { backgroundColor: accent },
                    ]}
                    onPress={() => {
                      setKind('chapter');
                      if (status === 'draft') setStatus('in_review');
                      setEditingId(null);
                      setEditingVersion(undefined);
                      setIsSaved(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.segLabel,
                        { color: kind === 'chapter' ? '#fff' : textMuted },
                      ]}
                    >
                      Capítulos ({chapters.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={saving}
                    style={[
                      styles.segBtn,
                      kind === 'draft' && { backgroundColor: accent },
                    ]}
                    onPress={() => {
                      setKind('draft');
                      setStatus('draft');
                      setEditingId(null);
                      setEditingVersion(undefined);
                      setIsSaved(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.segLabel,
                        { color: kind === 'draft' ? '#fff' : textMuted },
                      ]}
                    >
                      Rascunhos ({drafts.length})
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  disabled={saving}
                  style={[styles.chipBtn, { backgroundColor: bgChip }]}
                  onPress={() => setShowList(true)}
                >
                  <FolderOpen size={15} color={accent} />
                  <Text style={[styles.chipLabel, { color: textMain }]}>
                    Capítulos / Ler
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={saving}
                  style={[styles.chipBtn, { backgroundColor: bgChip }]}
                  onPress={() => {
                    const nextKind = kind;
                    setEditingId(null);
                    setEditingVersion(undefined);
                    setStatus(nextKind === 'draft' ? 'draft' : 'in_review');
                    setTitle(
                      nextKind === 'chapter'
                        ? 'Novo Capítulo'
                        : 'Novo Rascunho',
                    );
                    setContent('');
                    setIsSaved(true);
                    void clearLocalRecovery(userId, storyId);
                    onRemoteRecoveryChangeRef.current?.(null);
                  }}
                >
                  <PlusCircle size={15} color={textMain} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    {
                      backgroundColor: savedToast ? '#15803d' : accent,
                      opacity: saving ? 0.65 : 1,
                    },
                  ]}
                  disabled={saving}
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
                      ? 'Salvando'
                      : savedToast
                        ? 'Salvo'
                        : editingId
                          ? 'Atualizar'
                          : 'Salvar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.row}>
              {formatButtons.map(({ action, label, Icon }) => (
                <TouchableOpacity
                  key={action}
                  disabled={saving}
                  style={[styles.formatBtn, { backgroundColor: bgCard }]}
                  onPress={() => handleFormat(action)}
                >
                  <Icon size={14} color={accent} />
                  <Text style={[styles.formatLabel, { color: textMain }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.row}>
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
                await Clipboard.setStringAsync(`${title}\n\n${content}`);
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
                {copied ? 'Copiado' : 'Copiar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chipBtn, { backgroundColor: bgCard }]}
              onPress={() =>
                void Share.share({ title, message: `${title}\n\n${content}` })
              }
            >
              <Share2 size={14} color={textMain} />
              <Text style={[styles.chipLabel, { color: textMain }]}>
                Compartilhar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={Boolean(exporting)}
              style={[styles.chipBtn, { backgroundColor: bgCard }]}
              onPress={() => void handleExportTxt()}
            >
              <Download size={14} color={accent} />
              <Text style={[styles.chipLabel, { color: textMain }]}>
                {exporting === 'txt' ? 'TXT...' : 'TXT'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={Boolean(exporting)}
              style={[styles.chipBtn, { backgroundColor: bgCard }]}
              onPress={() => void handleExportPdf()}
            >
              <Download size={14} color={accent} />
              <Text style={[styles.chipLabel, { color: textMain }]}>
                {exporting === 'pdf' ? 'PDF...' : 'PDF'}
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
                {isFocus ? 'Sair do Foco' : 'Modo Foco'}
              </Text>
            </TouchableOpacity>
          </View>

          {showTypography && (
            <View style={[styles.card, { backgroundColor: bgCard }]}>
              <View style={styles.row}>
                {(['serif', 'sans', 'mono'] as const).map((f) => (
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
                        color: font === f ? '#fff' : textMain,
                        fontSize: 12,
                        fontWeight: '700',
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
                      color: indent ? '#fff' : textMain,
                      fontSize: 12,
                      fontWeight: '700',
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
                        color: fontSize === sz ? '#fff' : textMain,
                        fontSize: 12,
                        fontWeight: '700',
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
                      prev === 'normal'
                        ? 'relaxed'
                        : prev === 'relaxed'
                          ? 'loose'
                          : 'normal',
                    )
                  }
                >
                  <Text
                    style={{
                      color: textMain,
                      fontSize: 12,
                      fontWeight: '700',
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
              editable={!saving}
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

            <TextInput
              ref={bodyInputRef}
              value={content}
              editable={!saving}
              onSelectionChange={(e: TextInputSelectionChangeEvent) =>
                setSelection(e.nativeEvent.selection)
              }
              onChangeText={(txt) => {
                setContent(txt);
                setIsSaved(false);
              }}
              placeholder="Escreva aqui..."
              placeholderTextColor={textMuted}
              multiline
              textAlignVertical="top"
              style={[
                styles.bodyInput,
                fontStyle,
                {
                  color: textMain,
                  fontSize,
                  lineHeight,
                  opacity: saving ? 0.7 : 1,
                },
              ]}
            />

            <View style={styles.footer}>
              <View style={styles.row}>
                <FileText size={14} color={accent} />
                <Text style={{ color: textMuted, fontSize: 12 }}>
                  {wordCount} palavras
                </Text>
                <Type size={14} color={accent} />
                <Text style={{ color: textMuted, fontSize: 12 }}>
                  {content.length} caracteres
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
        kind={kind}
        entries={activeList}
        isDark={isDark}
        disabled={saving}
        onClose={() => setShowList(false)}
        onLoadEntry={(entry) =>
          fetchSingleEntryFromApi(apiConfig, storyId, entry.id, entry.kind)
        }
        onOpenInEditor={(entry) => {
          setEditingId(entry.id);
          setEditingVersion(entry.version);
          setKind(entry.kind);
          setStatus(entry.status);
          setTitle(entry.title);
          setContent(entry.content);
          setIsSaved(true);
          setShowList(false);
        }}
        onDeleteEntry={handleDeleteEntry}
      />

      <SessionConflictModal
        conflict={conflict}
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
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 14,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 12,
    fontWeight: '700',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 16,
  },
  bannerText: { fontSize: 12, fontWeight: '600', flex: 1 },
  card: { borderRadius: 22, padding: 14, gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { fontSize: 17, fontWeight: '700' },
  subInfo: { fontSize: 11, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusLabel: { fontSize: 11, fontWeight: '700' },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  segBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
  segLabel: { fontSize: 11, fontWeight: '700' },
  formatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  formatLabel: { fontSize: 11, fontWeight: '700' },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
  },
  chipLabel: { fontSize: 12, fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveLabel: { color: '#fff', fontSize: 12, fontWeight: '700' },
  editorCard: { borderRadius: 22, padding: 16, minHeight: 460, gap: 10 },
  titleInput: { fontSize: 22, fontWeight: '700', paddingBottom: 8 },
  bodyInput: { flex: 1, minHeight: 340 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
});
