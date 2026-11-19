import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { Session } from "../../features/auth/services/auth-api";

/**
 * Chaves padronizadas para armazenamento seguro de dados do sistema no SecureStore.
 * As chaves contêm apenas caracteres alfanuméricos e pontos, atendendo aos requisitos do SecureStore.
 */
export const SECURE_STORE_KEYS = {
  AUTH_SESSION: "capitulando.auth.session",
  AUTH_TOKEN: "capitulando.auth.token",
  USER_PROFILE: "capitulando.user.profile",
  SYSTEM_SETTINGS: "capitulando.system.settings",
  SYSTEM_DEVICE_ID: "capitulando.system.device_id",
} as const;

export type SecureStoreKey =
  | (typeof SECURE_STORE_KEYS)[keyof typeof SECURE_STORE_KEYS]
  | string;

// Armazenamento em memória para ambientes onde o SecureStore nativo não está disponível
const memoryFallback = new Map<string, string>();

/**
 * Verifica se a API do SecureStore está disponível no dispositivo atual.
 * Retorna true em Android e iOS nativos.
 */
export async function isSecureStoreAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Armazena uma string criptografada no SecureStore.
 * Caso o SecureStore não esteja disponível (ex: Web ou ambiente de testes), utiliza fallback apropriado.
 */
export async function setItem(
  key: SecureStoreKey,
  value: string,
  options?: SecureStore.SecureStoreOptions,
): Promise<void> {
  try {
    const available = await isSecureStoreAvailable();
    if (available) {
      await SecureStore.setItemAsync(key, value, options);
      return;
    }

    if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }

    memoryFallback.set(key, value);
  } catch (error) {
    console.error(`[SecureStore] Falha ao armazenar o item com a chave "${key}":`, error);
    throw error;
  }
}

/**
 * Recupera uma string criptografada do SecureStore.
 */
export async function getItem(
  key: SecureStoreKey,
  options?: SecureStore.SecureStoreOptions,
): Promise<string | null> {
  try {
    const available = await isSecureStoreAvailable();
    if (available) {
      return await SecureStore.getItemAsync(key, options);
    }

    if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }

    return memoryFallback.get(key) ?? null;
  } catch (error) {
    console.error(`[SecureStore] Falha ao obter o item com a chave "${key}":`, error);
    return null;
  }
}

/**
 * Remove um item do SecureStore.
 */
export async function deleteItem(
  key: SecureStoreKey,
  options?: SecureStore.SecureStoreOptions,
): Promise<void> {
  try {
    const available = await isSecureStoreAvailable();
    if (available) {
      await SecureStore.deleteItemAsync(key, options);
      return;
    }

    if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }

    memoryFallback.delete(key);
  } catch (error) {
    console.error(`[SecureStore] Falha ao excluir o item com a chave "${key}":`, error);
    throw error;
  }
}

/**
 * Serializa em JSON e armazena um objeto criptografado no SecureStore.
 */
export async function setObject<T>(
  key: SecureStoreKey,
  value: T,
  options?: SecureStore.SecureStoreOptions,
): Promise<void> {
  const serialized = JSON.stringify(value);
  await setItem(key, serialized, options);
}

/**
 * Recupera e faz o parse de um objeto JSON criptografado no SecureStore.
 */
export async function getObject<T>(
  key: SecureStoreKey,
  options?: SecureStore.SecureStoreOptions,
): Promise<T | null> {
  const raw = await getItem(key, options);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`[SecureStore] Erro ao deserializar JSON da chave "${key}":`, error);
    return null;
  }
}

/* =========================================================================
   Métodos auxiliares específicos para informações e credenciais do sistema
   ========================================================================= */

/**
 * Salva a sessão do usuário de forma criptografada.
 * Também mantém o token de acesso salvo individualmente para conveniência.
 */
export async function saveAuthSession(session: Session): Promise<void> {
  await setObject(SECURE_STORE_KEYS.AUTH_SESSION, session);
  if (session.accessToken) {
    await setItem(SECURE_STORE_KEYS.AUTH_TOKEN, session.accessToken);
  }
  if (session.user) {
    await setObject(SECURE_STORE_KEYS.USER_PROFILE, session.user);
  }
}

/**
 * Recupera a sessão criptografada do usuário.
 */
export async function getAuthSession(): Promise<Session | null> {
  return await getObject<Session>(SECURE_STORE_KEYS.AUTH_SESSION);
}

/**
 * Recupera apenas o token de autenticação criptografado.
 */
export async function getAuthToken(): Promise<string | null> {
  const token = await getItem(SECURE_STORE_KEYS.AUTH_TOKEN);
  if (token) return token;
  const session = await getAuthSession();
  return session?.accessToken ?? null;
}

/**
 * Limpa todos os dados de sessão do SecureStore.
 */
export async function clearAuthSession(): Promise<void> {
  await Promise.all([
    deleteItem(SECURE_STORE_KEYS.AUTH_SESSION),
    deleteItem(SECURE_STORE_KEYS.AUTH_TOKEN),
    deleteItem(SECURE_STORE_KEYS.USER_PROFILE),
  ]);
}

/**
 * Salva dados genéricos do sistema de forma segura e criptografada.
 */
export async function saveSystemData<T>(key: string, data: T): Promise<void> {
  await setObject(key, data);
}

/**
 * Recupera dados genéricos do sistema armazenados de forma criptografada.
 */
export async function getSystemData<T>(key: string): Promise<T | null> {
  return await getObject<T>(key);
}

/**
 * Remove dados genéricos do sistema do armazenamento criptografado.
 */
export async function removeSystemData(key: string): Promise<void> {
  await deleteItem(key);
}

/**
 * Objeto unificado com todos os métodos do SecureStore para importação prática.
 */
export const secureStore = {
  KEYS: SECURE_STORE_KEYS,
  isAvailable: isSecureStoreAvailable,
  setItem,
  getItem,
  deleteItem,
  setObject,
  getObject,
  saveAuthSession,
  getAuthSession,
  getAuthToken,
  clearAuthSession,
  saveSystemData,
  getSystemData,
  removeSystemData,
};

export default secureStore;
