import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  BookOpen,
  Edit3,
  Trash2,
  ArrowLeft,
  PenTool,
} from 'lucide-react-native';
import type { WritingEntry, WritingItemKind } from '../types';
import { getStatusLabel } from '../writing-store';

interface ChapterListModalProps {
  visible: boolean;
  kind: WritingItemKind;
  entries: WritingEntry[];
  isDark: boolean;
  disabled?: boolean;
  onClose: () => void;
  onLoadEntry?: (entry: WritingEntry) => Promise<WritingEntry | null>;
  onOpenInEditor: (entry: WritingEntry) => void;
  onDeleteEntry: (entry: WritingEntry) => void;
}

export function ChapterListModal({
  visible,
  kind,
  entries,
  isDark,
  disabled = false,
  onClose,
  onLoadEntry,
  onOpenInEditor,
  onDeleteEntry,
}: ChapterListModalProps) {
  const [readingEntry, setReadingEntry] = useState<WritingEntry | null>(null);
  const [loadingEntryId, setLoadingEntryId] = useState<string | null>(null);

  const bgMain = isDark ? '#120e17' : '#f3ccde';
  const bgCard = isDark ? '#1a1120' : '#fcf8f2';
  const bgItem = isDark ? '#24172d' : '#ffffff';
  const textPrimary = isDark ? '#f5f5f4' : '#1c1917';
  const textMuted = isDark ? '#a8a29e' : '#57534e';
  const accent = isDark ? '#9d174d' : '#4b1d3f';

  const handleCloseModal = () => {
    setReadingEntry(null);
    onClose();
  };

  const handleOpenReader = async (entry: WritingEntry) => {
    setReadingEntry(entry);
    if (!onLoadEntry) return;
    setLoadingEntryId(entry.id);
    try {
      const fresh = await onLoadEntry(entry);
      if (fresh) {
        setReadingEntry(fresh);
      }
    } finally {
      setLoadingEntryId(null);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleCloseModal}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: bgMain }]}>
        <View style={[styles.topBar, { backgroundColor: bgCard }]}>
          {readingEntry ? (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setReadingEntry(null)}
            >
              <ArrowLeft size={18} color={accent} />
              <Text style={[styles.topActionText, { color: accent }]}>
                Voltar à lista
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.titleWrap}>
              <BookOpen size={18} color={accent} />
              <Text style={[styles.topTitle, { color: textPrimary }]}>
                {kind === 'chapter' ? 'Capítulos' : 'Rascunhos'} (
                {entries.length})
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.iconBtn} onPress={handleCloseModal}>
            <PenTool size={15} color={textPrimary} />
            <Text style={[styles.topActionText, { color: textPrimary }]}>
              Espaço de Escrita
            </Text>
            <X size={18} color={textMuted} />
          </TouchableOpacity>
        </View>

        {readingEntry ? (
          <ScrollView contentContainerStyle={styles.readerScroll}>
            <View style={[styles.readerCard, { backgroundColor: bgCard }]}>
              <View style={styles.readerMetaRow}>
                <Text style={[styles.readerMeta, { color: accent }]}>
                  {getStatusLabel(readingEntry.status)} · v
                  {readingEntry.version} · {readingEntry.wordCount} palavras
                </Text>
                {loadingEntryId === readingEntry.id && (
                  <ActivityIndicator size="small" color={accent} />
                )}
              </View>
              <Text style={[styles.readerTitle, { color: textPrimary }]}>
                {readingEntry.title}
              </Text>
              <Text style={[styles.readerBody, { color: textPrimary }]}>
                {readingEntry.content || '(Capítulo sem conteúdo)'}
              </Text>

              <View style={styles.readerActions}>
                <TouchableOpacity
                  disabled={disabled}
                  style={[styles.primaryBtn, { backgroundColor: accent }]}
                  onPress={() => {
                    const target = readingEntry;
                    setReadingEntry(null);
                    onOpenInEditor(target);
                  }}
                >
                  <Edit3 size={15} color="#fff" />
                  <Text style={styles.primaryBtnText}>Abrir no Editor</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={disabled}
                  style={styles.dangerBtn}
                  onPress={() => {
                    const target = readingEntry;
                    setReadingEntry(null);
                    onDeleteEntry(target);
                  }}
                >
                  <Trash2 size={15} color="#991b1b" />
                  <Text style={styles.dangerBtnText}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.listScroll}>
            {entries.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: bgCard }]}>
                <Text style={[styles.emptyText, { color: textMuted }]}>
                  Nenhum {kind === 'chapter' ? 'capítulo' : 'rascunho'}{' '}
                  encontrado neste livro.
                </Text>
              </View>
            ) : (
              entries.map((entry) => (
                <View
                  key={entry.id}
                  style={[styles.itemCard, { backgroundColor: bgCard }]}
                >
                  <TouchableOpacity
                    style={styles.itemPressArea}
                    onPress={() => void handleOpenReader(entry)}
                  >
                    <Text style={[styles.itemTitle, { color: textPrimary }]}>
                      {entry.title}
                    </Text>
                    <Text style={[styles.itemMeta, { color: textMuted }]}>
                      {getStatusLabel(entry.status)} · v{entry.version} ·{' '}
                      {entry.wordCount} palavras
                    </Text>
                    <Text
                      numberOfLines={3}
                      style={[styles.itemPreview, { color: textMuted }]}
                    >
                      {entry.content || '(Sem prévia de texto)'}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.itemFooter}>
                    <TouchableOpacity
                      style={[styles.smallBtn, { backgroundColor: bgItem }]}
                      onPress={() => void handleOpenReader(entry)}
                    >
                      <BookOpen size={14} color={accent} />
                      <Text
                        style={[styles.smallBtnText, { color: textPrimary }]}
                      >
                        Ler
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={disabled}
                      style={[styles.smallBtn, { backgroundColor: accent }]}
                      onPress={() => onOpenInEditor(entry)}
                    >
                      <Edit3 size={14} color="#fff" />
                      <Text style={styles.smallBtnLightText}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={disabled}
                      style={[styles.smallBtn, { backgroundColor: '#fee2e2' }]}
                      onPress={() => onDeleteEntry(entry)}
                    >
                      <Trash2 size={14} color="#991b1b" />
                      <Text style={styles.smallBtnDangerText}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topTitle: { fontSize: 16, fontWeight: '700' },
  iconBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  topActionText: { fontSize: 12, fontWeight: '700' },
  listScroll: { padding: 14, gap: 12 },
  emptyCard: { borderRadius: 20, padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 13 },
  itemCard: { borderRadius: 20, padding: 14, gap: 10 },
  itemPressArea: { gap: 4 },
  itemTitle: { fontSize: 16, fontWeight: '700' },
  itemMeta: { fontSize: 11, fontWeight: '600' },
  itemPreview: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 6,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 11,
  },
  smallBtnText: { fontSize: 12, fontWeight: '700' },
  smallBtnLightText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  smallBtnDangerText: { color: '#991b1b', fontSize: 12, fontWeight: '700' },
  readerScroll: { padding: 14 },
  readerCard: { borderRadius: 22, padding: 18, gap: 12 },
  readerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readerMeta: { fontSize: 11, fontWeight: '700' },
  readerTitle: { fontSize: 22, fontWeight: '700' },
  readerBody: { fontSize: 16, lineHeight: 26 },
  readerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  dangerBtnText: { color: '#991b1b', fontSize: 12, fontWeight: '700' },
});