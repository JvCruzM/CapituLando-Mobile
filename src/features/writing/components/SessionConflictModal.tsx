import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { AlertTriangle, FilePlus2, GitMerge } from "lucide-react-native";
import { plainText } from "./editor-content";
import type { WritingEntry, WritingSessionConflict } from "../types";
import { countWords } from "../writing-store";

export type ConflictResolutionChoice =
  | "local"
  | "remote"
  | "merge"
  | "save_as_draft";

interface Props {
  conflict: WritingSessionConflict | null;
  isDark: boolean;
  busy?: boolean;
  savedChapter?: WritingEntry | null;
  error?: string | null;
  onResolve: (choice: ConflictResolutionChoice) => void;
}

export function SessionConflictModal({
  conflict,
  isDark,
  onResolve,
  busy,
  savedChapter,
  error,
}: Props) {
  if (!conflict) return null;

  const bgCard = isDark ? "#1a1321" : "#fcf8f2";
  const bgBox = isDark ? "#221a2b" : "#ffffff";
  const textPrimary = isDark ? "#f5f5f4" : "#1c1917";
  const textMuted = isDark ? "#c6bdc9" : "#655c63";
  const accent = isDark ? "#9d174d" : "#4b1d3f";

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <ScrollView
          style={{
            maxHeight: "90%",
            backgroundColor: bgCard,
            borderRadius: 24,
          }}
          contentContainerStyle={styles.card}
        >
          <View style={styles.header}>
            <AlertTriangle size={20} color="#d97706" />
            <Text style={[styles.title, { color: textPrimary }]}>
              Recuperação pendente em outra sessão
            </Text>
          </View>

          <Text style={[styles.desc, { color: textMuted }]}>
            Foi detectada uma alteração feita em outra sessão ou dispositivo
            para este livro. Escolha como deseja resolver:
          </Text>

          <View style={[styles.box, { backgroundColor: bgBox }]}>
            <Text style={[styles.boxLabel, { color: accent }]}>
              Sessão Atual ({countWords(conflict.local.content)} palavras)
            </Text>
            <Text
              numberOfLines={3}
              style={[styles.boxText, { color: textPrimary }]}
            >
              {plainText(conflict.local.content) || "(Sem texto)"}
            </Text>
          </View>

          <View style={[styles.box, { backgroundColor: bgBox }]}>
            <Text style={[styles.boxLabel, { color: accent }]}>
              Outra Sessão / Servidor ({countWords(conflict.remote.content)}{" "}
              palavras)
            </Text>
            <Text
              numberOfLines={3}
              style={[styles.boxText, { color: textPrimary }]}
            >
              {plainText(conflict.remote.content) || "(Sem texto)"}
            </Text>
          </View>

          {savedChapter ? (
            <View style={[styles.box, { backgroundColor: bgBox }]}>
              <Text style={{ color: textPrimary }}>
                Capítulo salvo: {savedChapter.title} · v{savedChapter.version}
              </Text>
              <Text numberOfLines={3} style={{ color: textPrimary }}>
                {plainText(savedChapter.content)}
              </Text>
              <Text style={{ color: textMuted }}>
                A versão escolhida ou mesclada será sua próxima edição sobre
                este capítulo. Salvar uma cópia mantém o capítulo original.
              </Text>
            </View>
          ) : null}
          {busy ? (
            <Text style={{ color: textPrimary }}>Resolvendo conflito...</Text>
          ) : null}
          {error ? <Text style={{ color: "#dc2626" }}>{error}</Text> : null}
          <TouchableOpacity
            disabled={busy}
            style={[styles.btn, { backgroundColor: accent }]}
            onPress={() => onResolve("local")}
          >
            <Text style={styles.btnLightText}>Manter Texto Atual</Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={busy}
            style={[styles.btn, { backgroundColor: bgBox }]}
            onPress={() => onResolve("remote")}
          >
            <Text style={[styles.btnDarkText, { color: textPrimary }]}>
              Usar Versão da Outra Sessão
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={busy}
            style={[styles.btn, { backgroundColor: "#fef3c7" }]}
            onPress={() => onResolve("merge")}
          >
            <GitMerge size={15} color="#92400e" />
            <Text style={[styles.btnDarkText, { color: "#92400e" }]}>
              Mesclar Ambas as Versões
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={busy}
            style={[styles.btn, { backgroundColor: "#ede9fe" }]}
            onPress={() => onResolve("save_as_draft")}
          >
            <FilePlus2 size={15} color="#5b21b6" />
            <Text style={[styles.btnDarkText, { color: "#5b21b6" }]}>
              Salvar Cópia como Novo Rascunho
            </Text>
          </TouchableOpacity>
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
  card: {
    borderRadius: 24,
    padding: 18,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  desc: {
    fontSize: 12,
    lineHeight: 18,
  },
  box: {
    borderRadius: 14,
    padding: 10,
    gap: 4,
  },
  boxLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  boxText: {
    fontSize: 12,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    padding: 12,
  },
  btnLightText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  btnDarkText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
