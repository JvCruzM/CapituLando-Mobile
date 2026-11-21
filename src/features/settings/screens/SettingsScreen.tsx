import { useState } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  HelperText,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
} from "react-native-paper";
import { Screen } from "../../../shared/components/Screen";
import { ReminderTimeInput } from "../components/ReminderTimeInput";
import { AccountQueryStatus } from "../../../shared/components/AccountQueryStatus";
import { accountErrorMessage } from "../../../shared/api/account";
import { useAuthStore } from "../../auth/session";
import {
  changeEmail,
  loadSettings,
  saveSettings,
  settingsKey,
  type SettingsDocument,
} from "../services/settings-api";
import {
  requestReminderPermission,
  synchronizeReminder,
} from "../services/reminder";

export function SettingsScreen() {
  const userId = useAuthStore((state) => state.session?.user.id ?? "");
  const query = useQuery({
    queryKey: settingsKey(userId),
    queryFn: ({ signal }) => loadSettings(signal),
    enabled: Boolean(userId),
  });
  if (!query.data)
    return (
      <AccountQueryStatus
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  return <SettingsForm key={userId} userId={userId} initial={query.data} />;
}

function SettingsForm({
  userId,
  initial,
}: {
  userId: string;
  initial: SettingsDocument;
}) {
  const client = useQueryClient();
  const [document, setDocument] = useState(initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validation, setValidation] = useState("");
  const [reminderError, setReminderError] = useState("");
  const save = useMutation({
    async mutationFn(input: SettingsDocument) {
      if (input.value.dailyReminder) await requestReminderPermission();
      return saveSettings(input);
    },
    async onSuccess(result) {
      setDocument(result);
      client.setQueryData(settingsKey(userId), result);
      setReminderError("");
      try {
        await synchronizeReminder(userId, result.value);
      } catch (cause) {
        setReminderError("Preferências salvas. " + accountErrorMessage(cause));
      }
    },
  });
  const reload = useMutation({
    mutationFn: () =>
      client.fetchQuery({
        queryKey: settingsKey(userId),
        queryFn: ({ signal }) => loadSettings(signal),
        staleTime: 0,
      }),
    onSuccess(result) {
      setDocument(result);
      save.reset();
    },
  });
  const emailChange = useMutation({
    mutationFn: changeEmail,
    onSuccess() {
      setPassword("");
      useAuthStore.getState().clearSession();
      router.replace({ pathname: "/entrar", params: { emailAlterado: "1" } });
    },
  });
  const busy = save.isPending || reload.isPending || emailChange.isPending;
  const conflict =
    axios.isAxiosError(save.error) && save.error.response?.status === 409;

  return (
    <Screen>
      <Text variant="headlineMedium" accessibilityRole="header">
        Aparência
      </Text>
      <Text variant="titleMedium">Tema</Text>
      <SegmentedButtons
        value={document.value.themeMode ?? "system"}
        onValueChange={(value) =>
          setDocument({
            ...document,
            value: {
              ...document.value,
              themeMode: value as "system" | "light" | "dark",
            },
          })
        }
        buttons={[
          { value: "system", label: "Sistema", disabled: busy },
          { value: "light", label: "Claro", disabled: busy },
          { value: "dark", label: "Escuro", disabled: busy },
        ]}
      />
      <Text variant="titleMedium">Lembrete diário de escrita</Text>
      <Switch
        accessibilityLabel="Ativar lembrete diário"
        value={document.value.dailyReminder ?? false}
        disabled={busy}
        onValueChange={(dailyReminder) =>
          setDocument({
            ...document,
            value: { ...document.value, dailyReminder },
          })
        }
      />
      <ReminderTimeInput
        value={document.value.reminderTime ?? "20:00"}
        disabled={busy || !document.value.dailyReminder}
        onChange={(reminderTime) =>
          setDocument({
            ...document,
            value: { ...document.value, reminderTime },
          })
        }
      />
      {Platform.OS === "web" ? (
        <Text>
          O horário fica salvo na conta. As notificações são enviadas pelo
          celular após a permissão no aparelho.
        </Text>
      ) : null}
      {reminderError ? (
        <HelperText type="error">{reminderError}</HelperText>
      ) : null}
      <Text variant="titleMedium">Alertas de metas</Text>
      <Switch
        accessibilityLabel="Ativar alertas de metas"
        value={document.value.goalAlerts ?? true}
        disabled={busy}
        onValueChange={(goalAlerts) =>
          setDocument({ ...document, value: { ...document.value, goalAlerts } })
        }
      />
      <Text variant="titleMedium">Tamanho do texto</Text>
      <SegmentedButtons
        value={document.value.fontSize ?? "md"}
        onValueChange={(value) =>
          setDocument({
            ...document,
            value: { ...document.value, fontSize: value as "sm" | "md" | "lg" },
          })
        }
        buttons={[
          { value: "sm", label: "Pequeno", disabled: busy },
          { value: "md", label: "Médio", disabled: busy },
          { value: "lg", label: "Grande", disabled: busy },
        ]}
      />
      {save.error || reload.error ? (
        <HelperText type="error" accessibilityLiveRegion="polite">
          {accountErrorMessage(save.error || reload.error)}
        </HelperText>
      ) : null}
      {conflict ? (
        <>
          <Text>
            Recarregar substitui as opções deste formulário pelos valores
            salvos.
          </Text>
          <Button
            disabled={busy}
            loading={reload.isPending}
            onPress={() => reload.mutate()}
          >
            Recarregar preferências
          </Button>
        </>
      ) : null}
      {save.isSuccess ? (
        <Text accessibilityLiveRegion="polite">Preferências salvas.</Text>
      ) : null}
      <Button
        mode="contained"
        disabled={busy || conflict}
        loading={save.isPending}
        onPress={() => {
          if (
            document.value.dailyReminder &&
            !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(
              document.value.reminderTime ?? "20:00",
            )
          ) {
            return setReminderError(
              "Informe o horário no formato HH:MM, como 20:00.",
            );
          }
          setReminderError("");
          save.mutate(document);
        }}
      >
        Salvar preferências
      </Button>
      <Text variant="headlineSmall" accessibilityRole="header">
        Alterar e-mail
      </Text>
      <Text>
        A alteração encerra suas sessões. Confirme o novo e-mail antes de entrar
        novamente.
      </Text>
      <TextInput
        mode="outlined"
        label="Novo e-mail"
        accessibilityLabel="Novo e-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        disabled={busy}
      />
      <TextInput
        mode="outlined"
        label="Senha atual"
        accessibilityLabel="Senha atual"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        disabled={busy}
      />
      {validation || emailChange.error ? (
        <HelperText type="error" accessibilityLiveRegion="polite">
          {validation || accountErrorMessage(emailChange.error)}
        </HelperText>
      ) : null}
      <Button
        disabled={busy}
        loading={emailChange.isPending}
        onPress={() => {
          setValidation("");
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !password) {
            return setValidation("Informe o novo e-mail e sua senha atual.");
          }
          emailChange.mutate({
            email: email.trim(),
            currentPassword: password,
          });
        }}
      >
        Alterar e-mail
      </Button>
    </Screen>
  );
}
