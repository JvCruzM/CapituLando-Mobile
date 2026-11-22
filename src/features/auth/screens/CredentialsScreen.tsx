import { useEffect, useRef, useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button, HelperText, Text, TextInput } from "react-native-paper";
import { Screen } from "../../../shared/components/Screen";
import {
  authErrorMessage,
  registerAccount,
  signIn,
} from "../services/auth-api";
import { useAuthStore } from "../session";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernamePattern = /^[A-Za-z0-9._-]{3,50}$/;

export function CredentialsScreen({ mode }: { mode: "login" | "register" }) {
  const registration = mode === "register";
  const { emailAlterado } = useLocalSearchParams<{ emailAlterado?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState(false);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  async function submit() {
    if (request.current) return;
    setError("");
    const credentials = { email: email.trim(), password };
    const cleanUsername = username.trim();

    if (!emailPattern.test(credentials.email))
      return setError("Informe um e-mail válido.");
    if (!password.trim()) return setError("Informe a senha.");
    if (registration && !usernamePattern.test(cleanUsername)) {
      return setError(
        "Use de 3 a 50 letras, números, pontos, traços ou sublinhados no nome de usuário.",
      );
    }
    if (registration && (password.length < 6 || password.length > 72)) {
      return setError("Use uma senha de 6 a 72 caracteres.");
    }
    if (registration && password !== confirmation)
      return setError("As senhas não coincidem.");

    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      if (registration) {
        await registerAccount(
          { ...credentials, username: cleanUsername },
          controller.signal,
        );
        if (!controller.signal.aborted) setRegistered(true);
      } else {
        const nextSession = await signIn(credentials, controller.signal);
        if (!controller.signal.aborted)
          await useAuthStore.getState().setSession(nextSession);
      }
      if (!controller.signal.aborted) {
        setPassword("");
        setConfirmation("");
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(authErrorMessage(cause, mode));
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  if (registered) {
    return (
      <Screen>
        <Text variant="headlineMedium" accessibilityRole="header">
          Confira seu e-mail
        </Text>
        <Text variant="bodyLarge">
          Confirme o cadastro pelo link enviado antes de entrar.
        </Text>
        <Link href="/entrar" replace asChild>
          <Button mode="contained">Ir para o login</Button>
        </Link>
        <Link href="/reenviar-confirmacao" asChild>
          <Button>Reenviar confirmação</Button>
        </Link>
      </Screen>
    );
  }

  const title = registration ? "Criar conta" : "Entrar";
  return (
    <Screen>
      <Text variant="headlineMedium" accessibilityRole="header">
        {registration ? "Crie sua conta" : "Entre na sua conta"}
      </Text>
      {!registration && (
        <Text variant="bodyLarge">Use os dados da sua conta CapituLando.</Text>
      )}
      {!registration && emailAlterado === "1" ? (
        <Text>Confirme o novo e-mail antes de entrar novamente.</Text>
      ) : null}
      <View style={styles.fields}>
        {registration && (
          <TextInput
            mode="outlined"
            label="Nome de usuário"
            accessibilityLabel="Nome de usuário"
            value={username}
            onChangeText={setUsername}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect={false}
            disabled={busy}
          />
        )}
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
        />
        <TextInput
          mode="outlined"
          label="Senha"
          accessibilityLabel="Senha"
          value={password}
          onChangeText={setPassword}
          autoComplete={registration ? "new-password" : "current-password"}
          autoCapitalize="none"
          secureTextEntry
          disabled={busy}
          returnKeyType={registration ? "next" : "go"}
          onSubmitEditing={registration ? undefined : () => void submit()}
        />
        {registration && (
          <TextInput
            mode="outlined"
            label="Confirmar senha"
            accessibilityLabel="Confirmar senha"
            value={confirmation}
            onChangeText={setConfirmation}
            autoComplete="new-password"
            autoCapitalize="none"
            secureTextEntry
            disabled={busy}
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
          />
        )}
        {error ? (
          <HelperText type="error" accessibilityLiveRegion="polite">
            {error}
          </HelperText>
        ) : null}
      </View>
      <Button
        mode="contained"
        loading={busy}
        disabled={busy}
        onPress={() => void submit()}
      >
        {title}
      </Button>
      <Link href={registration ? "/entrar" : "/cadastro"} replace asChild>
        <Button disabled={busy}>
          {registration ? "Já tenho uma conta" : "Criar conta"}
        </Button>
      </Link>
      {!registration ? (
        <>
          <Link href="/recuperar-senha" asChild>
            <Button disabled={busy}>Esqueci minha senha</Button>
          </Link>
          <Link href="/reenviar-confirmacao" asChild>
            <Button disabled={busy}>Reenviar confirmação</Button>
          </Link>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ fields: { gap: 12 } });
