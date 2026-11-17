import axios from "axios";
import { transport } from "../../../shared/api/http";

interface Credentials {
  email: string;
  password: string;
}

export interface Session {
  accessToken: string;
  expiresAt: number;
  user: { id: string; displayName: string };
}

export async function signIn(
  credentials: Credentials,
  signal: AbortSignal,
): Promise<Session> {
  const { data } = await transport.post("/api/auth/login", credentials, {
    signal,
  });
  if (
    typeof data?.accessToken !== "string" ||
    !data.accessToken.trim() ||
    typeof data?.expiresInSeconds !== "number" ||
    !Number.isSafeInteger(data.expiresInSeconds) ||
    data.expiresInSeconds <= 0 ||
    typeof data?.user?.id !== "string" ||
    !data.user.id.trim() ||
    typeof data?.user?.displayName !== "string"
  ) {
    throw new Error("A API devolveu uma sessão inválida.");
  }
  return {
    accessToken: data.accessToken,
    expiresAt: Date.now() + data.expiresInSeconds * 1000,
    user: { id: data.user.id, displayName: data.user.displayName },
  };
}

export async function registerAccount(
  credentials: Credentials & { username: string },
  signal: AbortSignal,
) {
  await transport.post("/api/auth/register", credentials, { signal });
}

export function authErrorMessage(error: unknown, mode: "login" | "register") {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? error.message
      : "Não foi possível concluir a operação.";
  }
  const response = error.response;
  if (!response)
    return "Não foi possível conectar ao servidor. Confira sua conexão.";
  if (response.status === 401 && mode === "login")
    return "E-mail ou senha incorretos.";
  if ([404, 405, 501, 503].includes(response.status)) {
    return "O serviço de autenticação está indisponível.";
  }

  const message = response.data?.error?.message ?? response.data?.message;
  if (response.status < 500 && typeof message === "string" && message.trim())
    return message;
  return mode === "login"
    ? "Não foi possível entrar. Tente novamente."
    : "Não foi possível criar a conta. Tente novamente.";
}
