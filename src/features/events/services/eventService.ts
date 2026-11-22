import { accountRequest } from "../../../shared/api/account";

export interface LocationOption {
  id: string;
  name: string;
}

export interface EventRecord {
  id: string;
  storyId: string;
  chapterId?: string | null;
  locationId?: string | null;
  title: string;
  description?: string | null;
  chronologicalDate?: string | null;
  sequenceOrder?: number | null;
  eventImage?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveEventPayload {
  title: string;
  description?: string | null;
  chronologicalDate?: string | null;
  sequenceOrder?: number | null;
  eventImage?: string | null;
  chapterId?: string | null;
  locationId?: string | null;
}

export async function listEvents(storyId: string): Promise<EventRecord[]> {
  return accountRequest<EventRecord[]>({
    url: `/api/stories/${storyId}/events`,
    method: "GET",
  });
}

export async function getEvent(
  storyId: string,
  eventId: string,
): Promise<EventRecord> {
  return accountRequest<EventRecord>({
    url: `/api/stories/${storyId}/events/${eventId}`,
    method: "GET",
  });
}

export async function createEvent(
  storyId: string,
  payload: SaveEventPayload,
): Promise<EventRecord> {
  return accountRequest<EventRecord>({
    url: `/api/stories/${storyId}/events`,
    method: "POST",
    data: payload,
  });
}

export async function updateEvent(
  storyId: string,
  eventId: string,
  payload: SaveEventPayload,
): Promise<EventRecord> {
  return accountRequest<EventRecord>({
    url: `/api/stories/${storyId}/events/${eventId}`,
    method: "PUT",
    data: payload,
  });
}

export async function deleteEvent(
  storyId: string,
  eventId: string,
): Promise<void> {
  await accountRequest<void>({
    url: `/api/stories/${storyId}/events/${eventId}`,
    method: "DELETE",
  });
}

export async function listStoryLocations(
  storyId: string,
): Promise<LocationOption[]> {
  return accountRequest<LocationOption[]>({
    url: `/api/stories/${storyId}/locations`,
    method: "GET",
  });
}
