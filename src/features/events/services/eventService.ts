import { accountRequest } from "../../../shared/api/account";

export interface LocationOption {
  id: string;
  name: string;
}

export interface ChapterOption {
  id: string;
  title: string;
  chapterOrder?: number | null;
}

export interface EventRecord {
  id: string;
  story: { id: string };
  chapter?: { id: string } | null;
  location?: { id: string } | null;
  title: string;
  description?: string | null;
  chronologicalDate?: string | null;
  sequenceOrder?: number | null;
  eventImage?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveEventPayload {
  story: { id: string };
  location: { id: string } | null;
  chapter?: { id: string } | null;
  title: string;
  description?: string | null;
  chronologicalDate?: string | null;
  sequenceOrder?: number | null;
}

export async function listEvents(storyId: string): Promise<EventRecord[]> {
  return accountRequest<EventRecord[]>("/world/events", {
    query: { storyId },
  });
}

export async function createEvent(payload: SaveEventPayload): Promise<EventRecord> {
  return accountRequest<EventRecord>("/world/events", {
    method: "POST",
    body: payload,
  });
}

export async function updateEvent(
  eventId: string,
  payload: SaveEventPayload
): Promise<EventRecord> {
  return accountRequest<EventRecord>(`/world/events/${eventId}`, {
    method: "PUT",
    body: payload,
  });
}

export async function deleteEvent(eventId: string): Promise<void> {
  await accountRequest<void>(`/world/events/${eventId}`, {
    method: "DELETE",
  });
}

export async function listStoryLocations(storyId: string): Promise<LocationOption[]> {
  return accountRequest<LocationOption[]>("/world/locations", {
    query: { storyId },
  });
}

export async function listStoryChapters(storyId: string): Promise<ChapterOption[]> {
  return accountRequest<ChapterOption[]>("/chapters", {
    query: { storyId },
  });
}
