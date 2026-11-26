import { useEffect, useRef, useState } from "react";
import { Link } from "expo-router";
import { HelperText, Text } from "react-native-paper";
import { Button, TextInput } from "../../../shared/components/Controls";
import { Screen } from "../../../shared/components/Screen";
import { authErrorMessage, requestAccountEmail } from "../services/auth-api";

export function EmailRequestScreen({ mode }: { mode: "recover" | "resend" }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function submit() {
    if (request.current) return;
    setMessage("");
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setError("Informe um e-mail válido.");
    }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      const result = await requestAccountEmail(
        mode,
        email.trim(),
        controller.signal,
      );
      if (!controller.signal.aborted) setMessage(result.message);
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
        {mode === "recover" ? "Recuperar senha" : "Reenviar confirmação"}
      </Text>
      <Text>Informe o e-mail da sua conta para receber as instruções.</Text>
      <TextInput
        mode="outlined"
        label="E-mail"
        accessibilityLabel="E-mail"
        value={email}
        onChangeText={setEmail}
        autoComplete="email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        disabled={busy}
        onSubmitEditing={() => void submit()}
      />
      {error ? (
        <HelperText type="error" accessibilityLiveRegion="polite">
          {error}
        </HelperText>
      ) : null}
      {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}
      <Button
        mode="contained"
        disabled={busy}
        loading={busy}
        onPress={() => void submit()}
      >
        Enviar instruções
      </Button>
      <Link href="/entrar" replace asChild>
        <Button disabled={busy}>Voltar para o login</Button>
      </Link>
    </Screen>
  );
}
