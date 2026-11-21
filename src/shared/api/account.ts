import axios, { type AxiosRequestConfig } from "axios";
import { transport } from "./http";
import { useAuthStore } from "../../features/auth/session";

export async function accountRequest<T>(config: AxiosRequestConfig) {
  const session = useAuthStore.getState().session;
  if (!session) {
    throw new Error("Sua sessão expirou. Entre novamente para continuar.");
  }
  const { data } = await transport.request<T>({
    ...config,
    headers: {
      ...config.headers,
      Authorization: `Bearer ${session.accessToken}`,
    },
  });
  if (useAuthStore.getState().session?.user.id !== session.user.id) {
    throw new Error("A conta conectada mudou. Abra esta tela novamente.");
  }
  return data;
}

export function accountErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401)
      return "Sua sessão expirou. Entre novamente para continuar.";
    const message = error.response?.data?.error?.message;
    if (typeof message === "string") return message;
    return "Não foi possível concluir a operação. Confira sua conexão.";
  }
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação.";
}
