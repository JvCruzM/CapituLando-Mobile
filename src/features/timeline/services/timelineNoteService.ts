import { useAuthStore } from "../../auth/session";
import { accountRequest } from "../../../shared/api/account";
interface Entry {
  id: string;
  projectId: string;
  title: string;
  yearOrDate: string;
  description?: string;
  characters?: string;
  order?: number;
  location?: string;
}
interface Document {
  revision: number;
  value: Entry[];
}
export interface FreeChronologyEntry {
  id: string;
  storyId: string;
  eraLabel: string;
  title: string;
  content: string;
  order: number;
  characters?: string;
}
export interface SaveFreeChronologyPayload {
  title: string;
  eraLabel?: string | null;
  content?: string | null;
  order?: number | null;
  characters?: string;
  locationId?: string | null;
  location?: string;
}
const read = () => accountRequest<Document>({ url: "/api/workspace/events" });
const toEntry = (e: Entry, index: number): FreeChronologyEntry => ({
  id: e.id,
  storyId: e.projectId,
  title: e.title,
  eraLabel: e.yearOrDate,
  content: e.description ?? "",
  order: e.order ?? index,
  characters: e.characters,
});
export async function listFreeChronology(storyId: string) {
  return (await read()).value
    .filter((e) => e.projectId === storyId)
    .map(toEntry);
}
async function save(
  storyId: string,
  payload: SaveFreeChronologyPayload,
  id?: string,
) {
  const sessionVersion = useAuthStore.getState().sessionVersion;
  const doc = await read();
  if (sessionVersion !== useAuthStore.getState().sessionVersion)
    throw new Error("A sessão mudou. Abra a cronologia novamente.");
  const existing = id
    ? doc.value.find((e) => e.id === id && e.projectId === storyId)
    : undefined;
  if (id && !existing)
    throw new Error("Marco não encontrado. Atualize a cronologia.");
  const entry: Entry = {
    ...existing,
    id:
      id ?? "mobile_" + Date.now() + "_" + Math.random().toString(36).slice(2),
    projectId: storyId,
    title: payload.title,
    yearOrDate: payload.eraLabel || "Data não registrada",
    description: payload.content ?? "",
    location: payload.location ?? existing?.location ?? "",
    order: payload.order ?? 0,
    characters: payload.characters ?? existing?.characters ?? "",
  };
  await accountRequest({
    url: "/api/workspace/events",
    method: "PUT",
    data: {
      revision: doc.revision,
      value: id
        ? doc.value.map((e) => (e.id === id ? entry : e))
        : [...doc.value, entry],
    },
  });
  return toEntry(entry, 0);
}
export const createFreeChronologyEntry = (
  storyId: string,
  payload: SaveFreeChronologyPayload,
) => save(storyId, payload);
export const updateFreeChronologyEntry = (
  storyId: string,
  id: string,
  payload: SaveFreeChronologyPayload,
) => save(storyId, payload, id);
export async function deleteFreeChronologyEntry(storyId: string, id: string) {
  const version = useAuthStore.getState().sessionVersion;
  const doc = await read();
  if (version !== useAuthStore.getState().sessionVersion)
    throw new Error("A sessão mudou.");
  await accountRequest({
    url: "/api/workspace/events",
    method: "PUT",
    data: {
      revision: doc.revision,
      value: doc.value.filter((e) => !(e.id === id && e.projectId === storyId)),
    },
  });
}
