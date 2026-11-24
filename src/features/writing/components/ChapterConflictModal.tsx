import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import {
  AlertTriangle,
  CloudDownload,
  FilePlus2,
  PenLine,
  UploadCloud,
} from "lucide-react-native";
import type { WritingEntry } from "../types";
import { plainText } from "./editor-content";
interface Props {
  chapter: WritingEntry | null;
  isDark: boolean;
  busy: boolean;
  error?: string | null;
  onDismiss: () => void;
  onLoadServer: () => void;
  onSaveCopy: () => void;
  onOverwrite: () => void;
}
export function ChapterConflictModal({
  chapter,
  isDark,
  busy,
  error,
  onDismiss,
  onLoadServer,
  onSaveCopy,
  onOverwrite,
}: Props) {
  if (!chapter) return null;
  const background = isDark ? "#1a1120" : "#fcf8f2";
  const box = isDark ? "#24172d" : "#ffffff";
  const text = isDark ? "#f5f5f4" : "#1c1917";
  const muted = isDark ? "#a8a29e" : "#57534e";
  const accent = isDark ? "#9d174d" : "#4b1d3f";
  const actions = [
    {
      label: "Carregar versão do servidor",
      Icon: CloudDownload,
      onPress: onLoadServer,
      background: accent,
      color: "#ffffff",
      border: accent,
    },
    {
      label: "Salvar cópia como novo rascunho",
      Icon: FilePlus2,
      onPress: onSaveCopy,
      background: "#ede9fe",
      color: "#5b21b6",
      border: "#c4b5fd",
    },
    {
      label: "Sobrescrever versão do servidor",
      Icon: UploadCloud,
      onPress: onOverwrite,
      background: "#fee2e2",
      color: "#991b1b",
      border: "#fca5a5",
    },
    {
      label: "Continuar editando",
      Icon: PenLine,
      onPress: onDismiss,
      background: box,
      color: text,
      border: isDark ? "#68465e" : "#d6c4cf",
    },
  ];
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onDismiss();
      }}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            if (!busy) onDismiss();
          }}
          accessibilityLabel="Fechar aviso de conflito"
          accessibilityRole="button"
          disabled={busy}
        />
        <ScrollView
          style={[styles.card, { backgroundColor: background }]}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <AlertTriangle size={20} color="#d97706" />
            <Text style={[styles.title, { color: text }]}>
              Conflito de versão
            </Text>
          </View>
          <Text style={[styles.description, { color: muted }]}>
            Este capítulo mudou em outra sessão. Escolha como deseja continuar
            com sua edição.
          </Text>
          <View style={[styles.preview, { backgroundColor: box }]}>
            <Text style={[styles.previewTitle, { color: text }]}>
              {chapter.title} · versão {chapter.version} no servidor
            </Text>
            <Text
              numberOfLines={3}
              style={[styles.description, { color: muted }]}
            >
              {plainText(chapter.content) || "(Sem texto)"}
            </Text>
          </View>
          <Text style={[styles.description, { color: muted }]}>
            Salvar uma cópia preserva o capítulo original. Sobrescrever
            substitui o texto salvo no servidor pela sua edição atual.
          </Text>
          {error ? (
            <Text
              accessibilityRole="alert"
              style={{ color: isDark ? "#fca5a5" : "#b91c1c" }}
            >
              {error}
            </Text>
          ) : null}
          {busy ? (
            <View style={styles.progress}>
              <ActivityIndicator color={isDark ? "#f9a8d4" : accent} />
              <Text style={{ color: text }}>Salvando...</Text>
            </View>
          ) : null}
          <View style={styles.actions}>
            {actions.map(
              ({
                label,
                Icon,
                onPress,
                background: buttonBackground,
                color,
                border,
              }) => (
                <TouchableOpacity
                  key={label}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy }}
                  disabled={busy}
                  onPress={onPress}
                  activeOpacity={0.75}
                  style={[
                    styles.button,
                    {
                      backgroundColor: buttonBackground,
                      borderColor: border,
                      opacity: busy ? 0.55 : 1,
                    },
                  ]}
                >
                  <Icon size={18} color={color} />
                  <Text style={[styles.buttonText, { color }]}>{label}</Text>
                </TouchableOpacity>
              ),
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    padding: 18,
  },
  card: { maxHeight: "90%", borderRadius: 24 },
  content: { padding: 18, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, fontSize: 17, fontWeight: "700" },
  description: { fontSize: 12, lineHeight: 18 },
  preview: { borderRadius: 14, padding: 12, gap: 6 },
  previewTitle: { fontSize: 12, fontWeight: "700" },
  actions: { gap: 10 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  buttonText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  progress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
