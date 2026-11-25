import { Platform } from "react-native";
import { useEffect, useRef, useState } from "react";
import { Link } from "expo-router";
import { Button, HelperText, Text, TextInput } from "react-native-paper";
import { Screen } from "../../../shared/components/Screen";
import {
  authErrorMessage,
  resetAccountPassword,
  verifyAccount,
} from "../services/auth-api";
import { useAuthStore } from "../session";

interface Props {
  mode: "verify" | "reset";
  token?: string;
}

export function TokenScreen({ mode, token }: Props) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const session = useAuthStore((state) => state.session);
  const request = useRef<AbortController | null>(null);
  const validToken = Boolean(
    token && token.length >= 20 && token.length <= 512,
  );
  const reset = mode === "reset";

  useEffect(() => () => request.current?.abort(), []);

  async function submit() {
    if (request.current || !validToken || !token) return;
    setError("");
    if (reset) {
      if (
        password.length < 6 ||
        new TextEncoder().encode(password).length > 72
      ) {
        return setError(
          "Use uma senha de pelo menos 6 caracteres e até 72 bytes.",
        );
      }
      if (password !== confirmation)
        return setError("As senhas não coincidem.");
    }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      if (reset) await resetAccountPassword(token, password, controller.signal);
      else await verifyAccount(token, controller.signal);
      if (!controller.signal.aborted) {
        if (reset) useAuthStore.getState().clearSession();
        setPassword("");
        setConfirmation("");
        setDone(true);
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(authErrorMessage(cause, mode));
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <Screen>
      <Text variant="headlineMedium" accessibilityRole="header">
        {done
          ? reset
            ? "Senha redefinida"
            : "E-mail confirmado"
          : reset
            ? "Crie uma nova senha"
            : "Confirme seu e-mail"}
      </Text>
      {!validToken ? (
        <HelperText type="error">
          Este link está incompleto. Abra o link completo recebido por e-mail.
        </HelperText>
      ) : done ? (
        <Text>
          {Platform.OS === "web"
            ? reset
              ? "Senha redefinida. Você já pode fechar esta aba e voltar ao Expo Go para entrar com a nova senha."
              : "Sua conta está confirmada. Você já pode fechar esta aba e voltar ao Expo Go."
            : reset
              ? "Entre novamente com sua nova senha."
              : "Sua conta está confirmada."}
        </Text>
      ) : (
        <>
          {reset ? (
            <>
              <TextInput
                mode="outlined"
                label="Nova senha"
                accessibilityLabel="Nova senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                autoCapitalize="none"
                disabled={busy}
              />
              <TextInput
                mode="outlined"
                label="Confirmar nova senha"
                accessibilityLabel="Confirmar nova senha"
                value={confirmation}
                onChangeText={setConfirmation}
                secureTextEntry
                autoComplete="new-password"
                autoCapitalize="none"
                disabled={busy}
                onSubmitEditing={() => void submit()}
              />
            </>
          ) : (
            <Text>
              Toque no botão para concluir a confirmação da sua conta.
            </Text>
          )}
          {error ? (
            <HelperText type="error" accessibilityLiveRegion="polite">
              {error}
            </HelperText>
          ) : null}
          <Button
            mode="contained"
            loading={busy}
            disabled={busy}
            onPress={() => void submit()}
          >
            {reset ? "Salvar nova senha" : "Confirmar e-mail"}
          </Button>
        </>
      )}
      {!(Platform.OS === "web" && done) && (
        <Link href={session ? "/" : "/entrar"} replace asChild>
          <Button disabled={busy}>
            {session ? "Ir para o início" : "Ir para o login"}
          </Button>
        </Link>
      )}
    </Screen>
  );
}
