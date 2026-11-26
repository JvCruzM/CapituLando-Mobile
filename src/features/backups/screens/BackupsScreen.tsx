import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, HelperText, Portal, Text, useTheme } from "react-native-paper";
import { Button, TextInput } from "../../../shared/components/Controls";
import { Screen } from "../../../shared/components/Screen";
import { accountErrorMessage } from "../../../shared/api/account";
import { useAuthStore } from "../../auth/session";
import { chooseBackupFile, saveBackupFile } from "../services/backup-file";
import {
  clearAccountData,
  exportAccountBackup,
  parseBackup,
  restoreAccountBackup,
  type Backup,
} from "../services/backup-api";

type Action = "restore" | "clear";

export function BackupsScreen() {
  const userId = useAuthStore((state) => state.session?.user.id ?? "");
  const client = useQueryClient();
  const theme = useTheme();
  const [selected, setSelected] = useState<{
    name: string;
    data: Backup;
  } | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [choosing, setChoosing] = useState(false);
  const exportFile = useMutation({
    async mutationFn() {
      const data = await exportAccountBackup();
      const name = `capitulando-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      return saveBackupFile(JSON.stringify(data, null, 2), name);
    },
    onSuccess(result) {
      setMessage(
        result === "canceled"
          ? "Salvamento cancelado."
          : result === "saved"
            ? "Backup salvo na pasta escolhida."
            : "Arquivo preparado. Confira se o backup foi salvo no destino escolhido.",
      );
    },
    onError(cause) {
      setError(accountErrorMessage(cause));
    },
  });
  const destructive = useMutation({
    async mutationFn(operation: { action: Action; backup?: Backup }) {
      if (operation.action === "clear") await clearAccountData();
      else {
        if (!operation.backup)
          throw new Error("Selecione um arquivo de backup.");
        await restoreAccountBackup(operation.backup);
      }
    },
    async onSuccess(_result, operation) {
      await client.resetQueries({
        predicate: (query) => query.queryKey.includes(userId),
      });
      setAction(null);
      setSelected(null);
      setConfirmation("");
      setMessage(
        operation.action === "clear"
          ? "Conteúdo da conta apagado."
          : "Backup restaurado.",
      );
    },
    onError(cause) {
      setAction(null);
      setError(accountErrorMessage(cause));
    },
  });
  const busy = choosing || exportFile.isPending || destructive.isPending;
  const expected = action === "clear" ? "APAGAR" : "RESTAURAR";

  async function chooseFile() {
    if (busy) return;
    setError("");
    setMessage("");
    setSelected(null);
    setChoosing(true);
    try {
      const file = await chooseBackupFile();
      if (file) setSelected({ name: file.name, data: parseBackup(file.text) });
    } catch (cause) {
      setError(accountErrorMessage(cause));
    } finally {
      setChoosing(false);
    }
  }
  function confirm(next: Action) {
    setMessage("");
    setError("");
    setConfirmation("");
    setAction(next);
  }

  return (
    <Screen>
      <Text variant="headlineMedium" accessibilityRole="header">
        Backups
      </Text>
      <Text>
        Guarde uma cópia das histórias, personagens e demais conteúdos da sua
        conta.
      </Text>
      <Button
        mode="contained"
        disabled={busy}
        loading={exportFile.isPending}
        onPress={() => {
          setError("");
          setMessage("");
          exportFile.mutate();
        }}
      >
        Exportar backup
      </Button>
      <Text variant="titleLarge" accessibilityRole="header">
        Restaurar um arquivo
      </Text>
      <Button
        mode="outlined"
        disabled={busy}
        loading={choosing}
        onPress={() => void chooseFile()}
      >
        Selecionar backup
      </Button>
      {selected ? (
        <>
          <Text>Arquivo selecionado: {selected.name}</Text>
          <Button disabled={busy} onPress={() => confirm("restore")}>
            Restaurar backup selecionado
          </Button>
        </>
      ) : null}
      <Text variant="titleLarge" accessibilityRole="header">
        Limpar conteúdo
      </Text>
      <Text>
        Apaga as histórias e os conteúdos relacionados. Sua conta e credenciais
        são mantidas.
      </Text>
      <Button
        textColor={theme.colors.error}
        disabled={busy}
        onPress={() => confirm("clear")}
      >
        Apagar conteúdo da conta
      </Button>
      {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}
      {error ? (
        <HelperText type="error" accessibilityLiveRegion="polite">
          {error}
        </HelperText>
      ) : null}
      <Portal>
        <Dialog
          visible={action !== null}
          dismissable={!destructive.isPending}
          onDismiss={() => setAction(null)}
        >
          <Dialog.Title>
            {action === "clear" ? "Apagar conteúdo?" : "Substituir conteúdo?"}
          </Dialog.Title>
          <Dialog.Content>
            <Text>Exporte uma cópia do conteúdo atual antes de continuar.</Text>
            <Text>
              {action === "clear"
                ? "O conteúdo será apagado. Para recuperá-lo, você precisará de um backup."
                : "Os dados atuais serão substituídos pelos dados do arquivo selecionado."}
            </Text>
            <Text>Digite {expected} para confirmar.</Text>
            <TextInput
              accessibilityLabel="Confirmação da operação"
              value={confirmation}
              onChangeText={setConfirmation}
              autoCapitalize="characters"
              autoCorrect={false}
              disabled={destructive.isPending}
            />
          </Dialog.Content>
          <Dialog.Actions style={{ flexWrap: "wrap", gap: 8 }}>
            <Button
              disabled={destructive.isPending}
              onPress={() => setAction(null)}
            >
              Cancelar
            </Button>
            <Button
              textColor={theme.colors.error}
              disabled={confirmation !== expected || destructive.isPending}
              loading={destructive.isPending}
              onPress={() => {
                if (action)
                  destructive.mutate({ action, backup: selected?.data });
              }}
            >
              Confirmar operação
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}
