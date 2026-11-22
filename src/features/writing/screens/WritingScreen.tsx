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
} from 'lucide-react-native';
import type {
  WritingEntry,
  WritingItemKind,
  WritingRecoveryState,
} from '../../universe/types';
import {
  clearLocalRecovery,
  countWords,
  detectRecoveryConflict,
  getEntriesByStory,
  loadLocalRecovery,
  saveLocalRecovery,
  upsertWritingEntry,
} from '../writing-store';
import type {
  FontChoice,
  SpacingChoice,
  WritingSessionConflict,
} from '../types';
import { SessionConflictModal } from '../components/SessionConflictModal';

interface WritingScreenProps {
  userId?: string;
  storyId?: string;
  remoteRecovery?: WritingRecoveryState | null;
  onRemoteRecoveryChange?: (next: WritingRecoveryState | null) => void;
}

export function WritingScreen({
  userId = 'escritor_ativo',
  storyId = 'livro_padrao',
  remoteRecovery = null,
  onRemoteRecoveryChange,
}: WritingScreenProps) {
  const isDark = useColorScheme() === 'dark';
  const sessionIdRef = useRef(
    `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  );
  const hydratedRef = useRef(false);

  const [kind, setKind] = useState<WritingItemKind>('chapter');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVersion, setEditingVersion] = useState<number | undefined>(undefined);
  const [title, setTitle] = useState('Novo Capítulo');
  const [content, setContent] = useState('');

  const [chapters, setChapters] = useState<WritingEntry[]>([]);
  const [drafts, setDrafts] = useState<WritingEntry[]>([]);
  const [showList, setShowList] = useState(false);

  const [isSaved, setIsSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFocus, setIsFocus] = useState(false);
  const [showTypography, setShowTypography] = useState(false);
  const [recoveryBanner, setRecoveryBanner] = useState<string | null>(null);
  const [conflict, setConflict] = useState<WritingSessionConflict | null>(null);

  const [font, setFont] = useState<FontChoice>('serif');
  const [fontSize, setFontSize] = useState(18);
  const [spacing, setSpacing] = useState<SpacingChoice>('relaxed');
  const [indent, setIndent] = useState(true);

  const refreshItems = useCallback(async () => {
    const data = await getEntriesByStory(storyId);
    setChapters(data.chapters);
    setDrafts(data.drafts);
  }, [storyId]);

  const applyRecovery = useCallback((state: WritingRecoveryState) => {
    setKind(state.kind);
    setEditingId(state.itemId);
    setEditingVersion(state.version);
    setTitle(state.title);
    setContent(state.content);
    setIsSaved(false);
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      await refreshItems();
      const local = await loadLocalRecovery(userId);
      if (!active) return;

      const detected = detectRecoveryConflict(
        local,
        remoteRecovery,
        sessionIdRef.current,
      );

      if (detected) {
        setConflict(detected);
      } else if (local && (local.content.trim() || local.title !== 'Novo Capítulo')) {
        applyRecovery(local);
        setRecoveryBanner('Escrita recuperada automaticamente.');
      } else if (
        remoteRecovery &&
        (remoteRecovery.content.trim() || remoteRecovery.title !== 'Novo Capítulo')
      ) {
        applyRecovery(remoteRecovery);
        setRecoveryBanner('Escrita sincronizada de outra sessão.');
      }

      hydratedRef.current = true;
    }
    void init();
    return () => {
      active = false;
    };
  }, [applyRecovery, refreshItems, remoteRecovery, userId]);

  useEffect(() => {
    if (!hydratedRef.current || isSaved) return;
    const snapshot: WritingRecoveryState = {
      storyId,
      itemId: editingId,
      kind,
      title,
      content,
      version: (editingVersion ?? 0) + 1,
      sessionId: sessionIdRef.current,
      updatedAt: new Date().toISOString(),
    };

    void saveLocalRecovery(userId, snapshot);
    onRemoteRecoveryChange?.(snapshot);
  }, [
    content,
    editingId,
    editingVersion,
    isSaved,
    kind,
    onRemoteRecoveryChange,
    storyId,
    title,
    userId,
  ]);

  const handleResolveConflict = async (choice: 'local' | 'remote' | 'merge') => {
    if (!conflict) return;

    if (choice === 'local') {
      applyRecovery(conflict.local);
      await saveLocalRecovery(userId, {
        ...conflict.local,
        sessionId: sessionIdRef.current,
      });
      setRecoveryBanner('Versão local mantida.');
    } else if (choice === 'remote') {
      applyRecovery(conflict.remote);
      await saveLocalRecovery(userId, conflict.remote);
      setRecoveryBanner('Versão da outra sessão aplicada.');
    } else {
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
      await saveLocalRecovery(userId, merged);
      onRemoteRecoveryChange?.(merged);
      setRecoveryBanner('Versões mescladas com sucesso.');
    }

    setConflict(null);
  };

  const handleSaveEntry = async (forceOverwrite = false) => {
    setSaving(true);
    try {
      const saved = await upsertWritingEntry({
        id: editingId,
        storyId,
        title,
        content,
        kind,
        expectedVersion: editingVersion,
        forceOverwrite,
      });

      setEditingId(saved.id);
      setEditingVersion(saved.version);
      setIsSaved(true);
      setRecoveryBanner(null);
      await clearLocalRecovery(userId);
      onRemoteRecoveryChange?.(null);
      await refreshItems();

      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    } catch (err: unknown) {
      const e = err as { code?: string; serverEntry?: WritingEntry };
      if (e?.code === 'VERSION_CONFLICT' && e.serverEntry) {
        Alert.alert(
          'Conflito de versão',
          `Este item já está na versão ${e.serverEntry.version}. Deseja sobrescrever com o seu texto atual?`,
          [
            {
              text: 'Carregar versão salva',
              onPress: () => {
                if (!e.serverEntry) return;
                setEditingId(e.serverEntry.id);
                setEditingVersion(e.serverEntry.version);
                setTitle(e.serverEntry.title);
                setContent(e.serverEntry.content);
                setIsSaved(true);
              },
            },
            {
              text: 'Sobrescrever',
              style: 'destructive',
              onPress: () => void handleSaveEntry(true),
            },
          ],
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const activeList = kind === 'chapter' ? chapters : drafts;
  const wordCount = useMemo(() => countWords(content), [content]);
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const displayedContent = useMemo(() => {
    if (!indent || !content) return content;
    return content
      .split('\n')
      .map((line) => (line.trim() && !line.startsWith('    ') ? `    ${line}` : line))
      .join('\n');
  }, [content, indent]);

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
      ? { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) }
      : font === 'sans'
        ? { fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }) }
        : { fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }) };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bgMain }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {Boolean(recoveryBanner) && !isFocus && (
            <View style={[styles.banner, { backgroundColor: bgCard }]}>
              <RotateCcw size={15} color={accent} />
              <Text style={[styles.bannerText, { color: textMain }]}>{recoveryBanner}</Text>
            </View>
          )}

          {!isFocus && (
            <View style={[styles.card, { backgroundColor: bgCard }]}>
              <View style={styles.topRow}>
                <Feather size={20} color={accent} />
                <Text style={[styles.heading, { color: textMain }]}>Espaço de Escrita</Text>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: isSaved ? '#dcfce7' : '#fef3c7' },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: isSaved ? '#166534' : '#92400e',
                    }}
                  >
                    {isSaved ? 'Salvo' : 'Recuperando...'}
                  </Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.segment, { backgroundColor: bgChip }]}>
                  <TouchableOpacity
                    style={[
                      styles.segBtn,
                      kind === 'chapter' && { backgroundColor: accent },
                    ]}
                    onPress={() => {
                      setKind('chapter');
                      setEditingId(null);
                      setEditingVersion(undefined);
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
                    style={[
                      styles.segBtn,
                      kind === 'draft' && { backgroundColor: accent },
                    ]}
                    onPress={() => {
                      setKind('draft');
                      setEditingId(null);
                      setEditingVersion(undefined);
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
                  style={[styles.chipBtn, { backgroundColor: bgChip }]}
                  onPress={() => setShowList((prev) => !prev)}
                >
                  <FolderOpen size={15} color={accent} />
                  <Text style={[styles.chipLabel, { color: textMain }]}>Abrir</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.chipBtn, { backgroundColor: bgChip }]}
                  onPress={() => {
                    setEditingId(null);
                    setEditingVersion(undefined);
                    setTitle(kind === 'chapter' ? 'Novo Capítulo' : 'Novo Rascunho');
                    setContent('');
                    setIsSaved(true);
                  }}
                >
                  <PlusCircle size={15} color={textMain} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    { backgroundColor: savedToast ? '#15803d' : accent },
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
                    {savedToast ? 'Salvo' : editingId ? 'Atualizar' : 'Salvar'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showList && (
                <View style={styles.listBox}>
                  {activeList.length === 0 ? (
                    <Text style={{ color: textMuted, fontSize: 12 }}>
                      Nenhum {kind === 'chapter' ? 'capítulo' : 'rascunho'} salvo ainda.
                    </Text>
                  ) : (
                    activeList.map((entry) => (
                      <TouchableOpacity
                        key={entry.id}
                        style={[styles.entryItem, { backgroundColor: bgChip }]}
                        onPress={() => {
                          setEditingId(entry.id);
                          setEditingVersion(entry.version);
                          setTitle(entry.title);
                          setContent(entry.content);
                          setIsSaved(true);
                          setShowList(false);
                        }}
                      >
                        <Text style={[styles.entryTitle, { color: textMain }]}>
                          {entry.title}
                        </Text>
                        <Text style={[styles.entryMeta, { color: textMuted }]}>
                          v{entry.version} · {entry.wordCount} palavras
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </View>
          )}

          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.chipBtn, { backgroundColor: bgCard }]}
              onPress={() => setShowTypography((prev) => !prev)}
            >
              <Sliders size={14} color={textMain} />
              <Text style={[styles.chipLabel, { color: textMain }]}>Tipografia</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chipBtn, { backgroundColor: bgCard }]}
              onPress={async () => {
                await Clipboard.setStringAsync(`${title}\n\n${content}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }}
            >
              {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} color={textMain} />}
              <Text style={[styles.chipLabel, { color: textMain }]}>
                {copied ? 'Copiado' : 'Copiar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chipBtn, { backgroundColor: bgCard }]}
              onPress={() => void Share.share({ title, message: `${title}\n\n${content}` })}
            >
              <Share2 size={14} color={textMain} />
              <Text style={[styles.chipLabel, { color: textMain }]}>Compartilhar</Text>
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
                    <Text style={{ color: font === f ? '#fff' : textMain, fontSize: 12, fontWeight: '700' }}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.chipBtn, { backgroundColor: indent ? accent : bgChip }]}
                  onPress={() => setIndent((prev) => !prev)}
                >
                  <Text style={{ color: indent ? '#fff' : textMain, fontSize: 12, fontWeight: '700' }}>
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
                    <Text style={{ color: fontSize === sz ? '#fff' : textMain, fontSize: 12, fontWeight: '700' }}>
                      {sz}px
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.chipBtn, { backgroundColor: bgChip }]}
                  onPress={() =>
                    setSpacing((prev) =>
                      prev === 'normal' ? 'relaxed' : prev === 'relaxed' ? 'loose' : 'normal',
                    )
                  }
                >
                  <Text style={{ color: textMain, fontSize: 12, fontWeight: '700' }}>
                    Espaço: {spacing}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={[styles.editorCard, { backgroundColor: bgCard }]}>
            <TextInput
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                setIsSaved(false);
              }}
              placeholder="Título..."
              placeholderTextColor={textMuted}
              style={[styles.titleInput, { color: textMain }]}
            />

            <TextInput
              value={displayedContent}
              onChangeText={(txt) => {
                const raw = indent
                  ? txt
                      .split('\n')
                      .map((l) => l.replace(/^ {4}/, ''))
                      .join('\n')
                  : txt;
                setContent(raw);
                setIsSaved(false);
              }}
              placeholder="Escreva aqui..."
              placeholderTextColor={textMuted}
              multiline
              textAlignVertical="top"
              style={[styles.bodyInput, fontStyle, { color: textMain, fontSize, lineHeight }]}
            />

            <View style={styles.footer}>
              <View style={styles.row}>
                <FileText size={14} color={accent} />
                <Text style={{ color: textMuted, fontSize: 12 }}>{wordCount} palavras</Text>
                <Type size={14} color={accent} />
                <Text style={{ color: textMuted, fontSize: 12 }}>{content.length} caracteres</Text>
              </View>
              <View style={styles.row}>
                <Clock size={14} color={textMuted} />
                <Text style={{ color: textMuted, fontSize: 12 }}>~{readingMinutes} min</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
  heading: { fontSize: 17, fontWeight: '700', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  segBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
  segLabel: { fontSize: 11, fontWeight: '700' },
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
  listBox: { gap: 6, marginTop: 4 },
  entryItem: { padding: 10, borderRadius: 12 },
  entryTitle: { fontSize: 13, fontWeight: '700' },
  entryMeta: { fontSize: 11, marginTop: 2 },
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