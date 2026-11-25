import { SafeAreaView } from "react-native-safe-area-context";
import { RichTextEditor } from "./RichTextEditor";
import { plainText } from "./editor-content";
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { BookOpen, Edit3, Trash2, ArrowLeft } from "lucide-react-native";
import type { WritingEntry, WritingItemKind } from "../types";
import { getStatusLabel } from "../writing-store";

interface ChapterListModalProps {
  initialEntry?: WritingEntry | null;
  visible: boolean;
  kind: WritingItemKind;
  entries: WritingEntry[];
  isDark: boolean;
  disabled?: boolean;
  onClose: () => void;
  onBackToList?: () => void;
  onLoadEntry?: (entry: WritingEntry) => Promise<WritingEntry | null>;
  onOpenInEditor: (entry: WritingEntry) => void;
  onDeleteEntry: (entry: WritingEntry) => Promise<void>;
}

export function ChapterListModal({
  initialEntry,
  visible,
  kind,
  entries,
  isDark,
  disabled = false,
  onClose,
  onBackToList,
  onLoadEntry,
  onOpenInEditor,
  onDeleteEntry,
}: ChapterListModalProps) {
  const [readingEntry, setReadingEntry] = useState<WritingEntry | null>(null);
  const [loadingEntryId, setLoadingEntryId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<WritingEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const bgMain = isDark ? "#120e17" : "#f3ccde";
  const bgCard = isDark ? "#1a1120" : "#fcf8f2";
  const bgItem = isDark ? "#24172d" : "#ffffff";
  const textPrimary = isDark ? "#f5f5f4" : "#1c1917";
  const textMuted = isDark ? "#a8a29e" : "#57534e";
  const accent = isDark ? "#9d174d" : "#4b1d3f";

  const requestId = useRef(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    requestId.current++;
    setDeleteTarget(null);
    setDeleteError(null);
    setReadingEntry(visible ? (initialEntry ?? null) : null);
    setLoadingEntryId(null);
    setLoadError(null);
    if (visible && initialEntry) void handleOpenReader(initialEntry);
    return () => {
      requestId.current++;
    };
  }, [visible, kind, initialEntry]);
  const leaveReader = () => {
    requestId.current++;
    setReadingEntry(null);
    setDeleteTarget(null);
    setDeleteError(null);
    setLoadingEntryId(null);
    setLoadError(null);
  };
  const handleCloseModal = () => {
    if (deleting) return;
    leaveReader();
    onClose();
  };
  const handleOpenReader = async (entry: WritingEntry) => {
    if (disabled) return;
    const request = ++requestId.current;
    setReadingEntry(entry);
    setLoadError(null);
    if (!onLoadEntry) return;
    setLoadingEntryId(entry.id);
    try {
      const fresh = await onLoadEntry(entry);
      if (request === requestId.current) {
        if (!fresh) throw new Error("Este texto não está mais disponível.");
        setReadingEntry(fresh);
      }
    } catch (e) {
      if (request === requestId.current)
        setLoadError(
          e instanceof Error
            ? e.message
            : "Não foi possível atualizar o texto.",
        );
    } finally {
      if (request === requestId.current) setLoadingEntryId(null);
    }
  };

  const backToList = () => {
    if (deleting) return;
    if (onBackToList) {
      leaveReader();
      onBackToList();
    } else leaveReader();
  };
  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteEntry(deleteTarget);
      setDeleteTarget(null);
      if (onBackToList) {
        leaveReader();
        onBackToList();
      } else leaveReader();
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o texto.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      onRequestClose={() => {
        if (deleting) return;
        if (deleteTarget) {
          setDeleteTarget(null);
          setDeleteError(null);
        } else if (readingEntry) backToList();
        else handleCloseModal();
      }}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: bgMain }]}>
        <View style={[styles.topBar, { backgroundColor: bgCard }]}>
          {readingEntry ? (
            <TouchableOpacity
              accessibilityRole="button"
              disabled={deleting}
              style={styles.iconBtn}
              onPress={backToList}
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
                {kind === "chapter" ? "Capítulos" : "Rascunhos"} (
                {entries.length})
              </Text>
            </View>
          )}

          {!readingEntry && (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.iconBtn}
              onPress={handleCloseModal}
            >
              <ArrowLeft size={18} color={accent} />
              <Text style={[styles.topActionText, { color: accent }]}>
                Voltar ao editor
              </Text>
            </TouchableOpacity>
          )}
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
              {loadError && (
                <Text
                  accessibilityRole="alert"
                  style={{ color: isDark ? "#fca5a5" : "#991b1b" }}
                >
                  {loadError}
                </Text>
              )}
              <RichTextEditor
                key={readingEntry.id}
                value={readingEntry.content || "(Capítulo sem conteúdo)"}
                onChange={() => {}}
                disabled
                color={textPrimary}
                background={bgCard}
                fontSize={16}
                lineHeight={26}
                indent={false}
              />

              <View style={styles.readerActions}>
                <TouchableOpacity
                  disabled={disabled || deleting || Boolean(loadingEntryId)}
                  style={[styles.primaryBtn, { backgroundColor: accent }]}
                  onPress={() => {
                    const target = readingEntry;
                    onOpenInEditor(target);
                  }}
                >
                  <Edit3 size={15} color="#fff" />
                  <Text style={styles.primaryBtnText}>Abrir no Editor</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={disabled || Boolean(loadingEntryId)}
                  style={styles.dangerBtn}
                  onPress={() => {
                    const target = readingEntry;
                    setDeleteError(null);
                    setDeleteTarget(target);
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
                  Nenhum {kind === "chapter" ? "capítulo" : "rascunho"}{" "}
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
                    disabled={disabled}
                    onPress={() => void handleOpenReader(entry)}
                  >
                    <Text style={[styles.itemTitle, { color: textPrimary }]}>
                      {entry.title}
                    </Text>
                    <Text style={[styles.itemMeta, { color: textMuted }]}>
                      {getStatusLabel(entry.status)} · v{entry.version} ·{" "}
                      {entry.wordCount} palavras
                    </Text>
                    <Text
                      numberOfLines={3}
                      style={[styles.itemPreview, { color: textMuted }]}
                    >
                      {plainText(entry.content) || "(Sem prévia de texto)"}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.itemFooter}>
                    <TouchableOpacity
                      style={[styles.smallBtn, { backgroundColor: bgItem }]}
                      disabled={disabled}
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
                      disabled={disabled || Boolean(loadingEntryId)}
                      style={[styles.smallBtn, { backgroundColor: accent }]}
                      onPress={() => onOpenInEditor(entry)}
                    >
                      <Edit3 size={14} color="#fff" />
                      <Text style={styles.smallBtnLightText}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={disabled || Boolean(loadingEntryId)}
                      style={[styles.smallBtn, { backgroundColor: "#fee2e2" }]}
                      onPress={() => {
                        setDeleteError(null);
                        setDeleteTarget(entry);
                      }}
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
        {deleteTarget && (
          <View style={styles.confirmBackdrop}>
            <View
              accessibilityViewIsModal
              accessibilityRole="alert"
              style={[styles.confirmCard, { backgroundColor: bgCard }]}
            >
              <Text style={[styles.readerTitle, { color: textPrimary }]}>
                Excluir texto?
              </Text>
              <Text style={{ color: textPrimary }}>
                “{deleteTarget.title}” será excluído também no web. Se estiver
                aberto no editor, sua cópia será mantida como um novo rascunho.
              </Text>
              {deleteError && (
                <Text
                  accessibilityRole="alert"
                  style={{ color: isDark ? "#fca5a5" : "#991b1b" }}
                >
                  {deleteError}
                </Text>
              )}
              <View style={styles.readerActions}>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={deleting}
                  style={[styles.smallBtn, { backgroundColor: bgItem }]}
                  onPress={() => {
                    setDeleteTarget(null);
                    setDeleteError(null);
                  }}
                >
                  <Text style={{ color: textPrimary }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={deleting}
                  style={styles.dangerBtn}
                  onPress={() => void confirmDelete()}
                >
                  {deleting && (
                    <ActivityIndicator color="#991b1b" size="small" />
                  )}
                  <Text style={styles.dangerBtnText}>
                    {deleting ? "Excluindo…" : "Confirmar exclusão"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  confirmBackdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 22,
    padding: 24,
    gap: 16,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  titleWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  topTitle: { fontSize: 16, fontWeight: "700" },
  iconBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  topActionText: { fontSize: 12, fontWeight: "700" },
  listScroll: { padding: 14, gap: 12 },
  emptyCard: { borderRadius: 20, padding: 20, alignItems: "center" },
  emptyText: { fontSize: 13 },
  itemCard: { borderRadius: 20, padding: 14, gap: 10 },
  itemPressArea: { gap: 4 },
  itemTitle: { fontSize: 16, fontWeight: "700" },
  itemMeta: { fontSize: 11, fontWeight: "600" },
  itemPreview: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  itemFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    paddingTop: 6,
  },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 11,
  },
  smallBtnText: { fontSize: 12, fontWeight: "700" },
  smallBtnLightText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  smallBtnDangerText: { color: "#991b1b", fontSize: 12, fontWeight: "700" },
  readerScroll: { padding: 14 },
  readerCard: { borderRadius: 22, padding: 18, gap: 12 },
  readerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  readerMeta: { fontSize: 11, fontWeight: "700" },
  readerTitle: { fontSize: 22, fontWeight: "700" },
  readerBody: { fontSize: 16, lineHeight: 26 },
  readerActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    flexWrap: "wrap",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fee2e2",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  dangerBtnText: { color: "#991b1b", fontSize: 12, fontWeight: "700" },
});
