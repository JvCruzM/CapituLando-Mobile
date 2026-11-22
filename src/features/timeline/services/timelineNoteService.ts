import {
  createEvent,
  deleteEvent,
  EventRecord,
  listEvents,
  updateEvent,
} from "../../events/services/eventService";

export interface FreeChronologyEntry {
  id: string;
  storyId: string;
  eraLabel: string;
  title: string;
  content: string;
  order: number;
  locationId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveFreeChronologyPayload {
  eraLabel?: string | null;
  title: string;
  content?: string | null;
  order?: number | null;
  locationId?: string | null;
}

function toFreeChronologyEntry(event: EventRecord, index: number): FreeChronologyEntry {
  return {
    id: event.id,
    storyId: event.storyId,
    eraLabel: event.chronologicalDate ?? "",
    title: event.title,
    content: event.description ?? "",
    order: event.sequenceOrder ?? index + 1,
    locationId: event.locationId ?? null,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

export async function listFreeChronology(
  storyId: string,
): Promise<FreeChronologyEntry[]> {
  const events = await listEvents(storyId);
  return events
    .filter((event) => !event.chapterId)
    .sort((a, b) => {
      const orderA = a.sequenceOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.sequenceOrder ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    })
    .map(toFreeChronologyEntry);
}

export async function createFreeChronologyEntry(
  storyId: string,
  payload: SaveFreeChronologyPayload,
): Promise<FreeChronologyEntry> {
  const created = await createEvent(storyId, {
    title: payload.title,
    description: payload.content ?? null,
    chronologicalDate: payload.eraLabel ?? null,
    sequenceOrder: payload.order ?? null,
    locationId: payload.locationId ?? null,
    chapterId: null,
  });
  return toFreeChronologyEntry(created, 0);
}

export async function updateFreeChronologyEntry(
  storyId: string,
  entryId: string,
  payload: SaveFreeChronologyPayload,
): Promise<FreeChronologyEntry> {
  const updated = await updateEvent(storyId, entryId, {
    title: payload.title,
    description: payload.content ?? null,
    chronologicalDate: payload.eraLabel ?? null,
    sequenceOrder: payload.order ?? null,
    locationId: payload.locationId ?? null,
    chapterId: null,
  });
  return toFreeChronologyEntry(updated, 0);
}

export async function deleteFreeChronologyEntry(
  storyId: string,
  entryId: string,
): Promise<void> {
  await deleteEvent(storyId, entryId);
}
