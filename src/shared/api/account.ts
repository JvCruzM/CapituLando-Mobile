import axios, { type AxiosRequestConfig } from "axios";
import { transport } from "./http";
import {
  useAuthStore,
  ensureAuthSession,
  refreshAuthSession,
} from "../../features/auth/session";

export async function accountRequest<T>(config: AxiosRequestConfig) {
  const version = useAuthStore.getState().sessionVersion;
  let session = await ensureAuthSession();
  const assertCurrent = () => {
    if (useAuthStore.getState().sessionVersion !== version)
      throw new Error("A sessão mudou. Abra esta tela novamente.");
  };
  assertCurrent();
  const request = () =>
    transport.request<T>({
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${session.accessToken}`,
      },
    });
  let response;
  try {
    response = await request();
  } catch (error) {
    assertCurrent();
    if (
      !axios.isAxiosError(error) ||
      error.response?.status !== 401 ||
      config.signal?.aborted
    )
      throw error;
    session = await refreshAuthSession(session.accessToken);
    assertCurrent();
    try {
      response = await request();
    } catch (retryError) {
      if (
        axios.isAxiosError(retryError) &&
        retryError.response?.status === 401 &&
        useAuthStore.getState().sessionVersion === version &&
        useAuthStore.getState().session?.accessToken === session.accessToken
      )
        await useAuthStore.getState().clearSession();
      throw retryError;
    }
  }
  assertCurrent();
  return response.data;
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
