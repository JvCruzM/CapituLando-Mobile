import axios from "axios";
import { transport } from "../../../shared/api/http";

interface Credentials {
  email: string;
  password: string;
}

export interface Session {
  sessionId: string;
  accessToken: string;
  refreshToken: string;
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
  return sessionFromResponse(data);
}

export function sessionFromResponse(value: unknown): Session {
  const data = value as Partial<Session & { expiresInSeconds: number }> | null;
  if (
    typeof data?.sessionId !== "string" ||
    !data.sessionId.trim() ||
    typeof data?.refreshToken !== "string" ||
    data.refreshToken.length < 20 ||
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
    sessionId: data.sessionId,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: Date.now() + data.expiresInSeconds * 1000,
    user: { id: data.user.id, displayName: data.user.displayName },
  };
}

export function isStoredSession(value: unknown): value is Session {
  const data = value as Partial<Session> | null;
  return Boolean(
    data &&
    typeof data.sessionId === "string" &&
    data.sessionId &&
    typeof data.accessToken === "string" &&
    data.accessToken &&
    typeof data.refreshToken === "string" &&
    data.refreshToken.length >= 20 &&
    typeof data.expiresAt === "number" &&
    Number.isFinite(data.expiresAt) &&
    typeof data.user?.id === "string" &&
    data.user.id &&
    typeof data.user.displayName === "string",
  );
}

export async function renewSession(session: Session) {
  const { data } = await transport.post("/api/auth/refresh", {
    refreshToken: session.refreshToken,
  });
  return sessionFromResponse(data);
}

export async function revokeSession(session: Session) {
  await transport.post(
    "/api/auth/logout",
    { refreshToken: session.refreshToken },
    {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    },
  );
}

export async function registerAccount(
  credentials: Credentials & { username: string },
  signal: AbortSignal,
) {
  await transport.post("/api/auth/register", credentials, { signal });
}

export async function requestAccountEmail(
  mode: "recover" | "resend",
  email: string,
  signal: AbortSignal,
) {
  const path = mode === "recover" ? "forgot-password" : "resend-verification";
  const { data } = await transport.post(
    `/api/auth/${path}`,
    { email },
    { signal },
  );
  return data as { message: string };
}

export async function verifyAccount(token: string, signal: AbortSignal) {
  await transport.post("/api/auth/verify-email", { token }, { signal });
}

export async function resetAccountPassword(
  token: string,
  newPassword: string,
  signal: AbortSignal,
) {
  await transport.post(
    "/api/auth/reset-password",
    { token, newPassword },
    { signal },
  );
}

export function authErrorMessage(
  error: unknown,
  mode: "login" | "register" | "verify" | "reset" | "recover" | "resend",
) {
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
  const fallback = {
    login: "Não foi possível entrar. Tente novamente.",
    register: "Não foi possível criar a conta. Tente novamente.",
    verify: "Não foi possível confirmar seu e-mail. Tente novamente.",
    reset: "Não foi possível redefinir a senha. Tente novamente.",
    recover: "Não foi possível solicitar a recuperação. Tente novamente.",
    resend: "Não foi possível solicitar a confirmação. Tente novamente.",
  };
  return fallback[mode];
}
