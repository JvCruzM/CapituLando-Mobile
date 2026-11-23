import { clearWritingCache } from "../../writing/writing-store";
import { useAuthStore } from "../../auth/session";
import { accountRequest } from "../../../shared/api/account";

export interface Backup {
  schemaVersion: 1;
  records: Record<string, unknown[]>;
  workspace: Record<string, unknown>;
}

export function parseBackup(text: string): Backup {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("O arquivo não contém um JSON válido.");
  }
  if (
    value?.schemaVersion !== 1 ||
    !value.records ||
    typeof value.records !== "object" ||
    Array.isArray(value.records) ||
    !Object.values(value.records).every(Array.isArray) ||
    !value.workspace ||
    typeof value.workspace !== "object" ||
    Array.isArray(value.workspace)
  ) {
    throw new Error("Formato de backup incompatível.");
  }
  return value;
}

export const exportAccountBackup = () =>
  accountRequest<Backup>({ url: "/api/backup" });
export async function restoreAccountBackup(data: Backup) {
  const owner = useAuthStore.getState().session?.user.id;
  await accountRequest<void>({
    url: "/api/backup",
    method: "POST",
    data,
    timeout: 60000,
  });
  if (owner) await clearWritingCache(owner);
}
export async function clearAccountData() {
  const owner = useAuthStore.getState().session?.user.id;
  await accountRequest<void>({
    url: "/api/backup",
    method: "DELETE",
    timeout: 60000,
  });
  if (owner) await clearWritingCache(owner);
}
