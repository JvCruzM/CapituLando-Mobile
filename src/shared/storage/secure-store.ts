import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { Session } from "../../features/auth/services/auth-api";

export {
  AFTER_FIRST_UNLOCK,
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  ALWAYS,
  ALWAYS_THIS_DEVICE_ONLY,
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
  WHEN_UNLOCKED,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY,
} from "expo-secure-store";

/**
 * Chaves padronizadas para armazenamento seguro de dados do sistema no SecureStore.
 * As chaves contêm apenas caracteres alfanuméricos e pontos, atendendo aos requisitos do SecureStore.
 */
export const SECURE_STORE_KEYS = {
  AUTH_SESSION: "capitulando.auth.session",
  AUTH_TOKEN: "capitulando.auth.token",
  AUTH_REFRESH_TOKEN: "capitulando.auth.refresh_token",
  USER_PROFILE: "capitulando.user.profile",
  SYSTEM_SETTINGS: "capitulando.system.settings",
  SYSTEM_DEVICE_ID: "capitulando.system.device_id",
  BIOMETRIC_CONFIG: "capitulando.system.biometrics",
  OFFLINE_CACHE: "capitulando.system.offline_cache",
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

    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      window.localStorage
    ) {
      window.localStorage.setItem(key, value);
      return;
    }

    memoryFallback.set(key, value);
  } catch (error) {
    console.error(
      `[SecureStore] Falha ao armazenar o item com a chave "${key}":`,
      error,
    );
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

    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      window.localStorage
    ) {
      return window.localStorage.getItem(key);
    }

    return memoryFallback.get(key) ?? null;
  } catch (error) {
    console.error(
      `[SecureStore] Falha ao obter o item com a chave "${key}":`,
      error,
    );
    return null;
  }
}

/**
 * Verifica se um item existe no SecureStore.
 */
export async function hasItem(
  key: SecureStoreKey,
  options?: SecureStore.SecureStoreOptions,
): Promise<boolean> {
  const item = await getItem(key, options);
  return item !== null;
}

/**
 * Armazena uma string exigindo autenticação biométrica (Face ID, Touch ID ou biometria nativa).
 */
export async function setItemWithAuth(
  key: SecureStoreKey,
  value: string,
  promptMessage = "Confirme sua identidade para proteger seus dados.",
): Promise<void> {
  return setItem(key, value, {
    requireAuthentication: true,
    authenticationPrompt: promptMessage,
  });
}

/**
 * Recupera uma string exigindo autenticação biométrica (Face ID, Touch ID ou biometria nativa).
 */
export async function getItemWithAuth(
  key: SecureStoreKey,
  promptMessage = "Confirme sua identidade para acessar seus dados protegidos.",
): Promise<string | null> {
  return getItem(key, {
    requireAuthentication: true,
    authenticationPrompt: promptMessage,
  });
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

    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      window.localStorage
    ) {
      window.localStorage.removeItem(key);
      return;
    }

    memoryFallback.delete(key);
  } catch (error) {
    console.error(
      `[SecureStore] Falha ao excluir o item com a chave "${key}":`,
      error,
    );
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
    console.error(
      `[SecureStore] Erro ao deserializar JSON da chave "${key}":`,
      error,
    );
    return null;
  }
}

/* =========================================================================
   Métodos auxiliares específicos para informações e credenciais do sistema
   ========================================================================= */

/**
 * Salva a sessão do usuário de forma criptografada.
 * As operações de sessão são serializadas para evitar gravações após logout.
 */
let authQueue: Promise<unknown> = Promise.resolve();
function enqueueAuth<T>(operation: () => Promise<T>): Promise<T> {
  const result = authQueue.catch(() => undefined).then(operation);
  authQueue = result;
  return result;
}

export function saveAuthSession(
  session: Session,
  isCurrent = () => true,
): Promise<void> {
  return enqueueAuth(async () => {
    if (!isCurrent()) return;
    // One authoritative document prevents partially saved credentials.
    await setObject(SECURE_STORE_KEYS.AUTH_SESSION, session);
    await Promise.all([
      deleteItem(SECURE_STORE_KEYS.AUTH_TOKEN),
      deleteItem(SECURE_STORE_KEYS.USER_PROFILE),
    ]);
  });
}

/**
 * Recupera a sessão criptografada do usuário.
 */
export function getAuthSession(): Promise<Session | null> {
  return enqueueAuth(() => getObject<Session>(SECURE_STORE_KEYS.AUTH_SESSION));
}

/**
 * Recupera apenas o token de autenticação criptografado.
 */
export async function getAuthToken(): Promise<string | null> {
  const session = await getAuthSession();
  return session?.accessToken ?? null;
}

/**
 * Limpa todos os dados de sessão do SecureStore.
 */
export function clearAuthSession(): Promise<void> {
  return enqueueAuth(async () => {
    await Promise.all([
      deleteItem(SECURE_STORE_KEYS.AUTH_SESSION),
      deleteItem(SECURE_STORE_KEYS.AUTH_TOKEN),
      deleteItem(SECURE_STORE_KEYS.USER_PROFILE),
    ]);
  });
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
  hasItem,
  setItemWithAuth,
  getItemWithAuth,
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
