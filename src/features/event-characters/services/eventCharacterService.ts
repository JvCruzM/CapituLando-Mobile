import { accountRequest } from "../../../shared/api/account";

export interface EventCharacterRecord {
  id: string;
  storyId: string;
  eventId: string;
  characterId: string;
  createdAt?: string;
}

export interface CreateEventCharacterPayload {
  eventId: string;
  characterId: string;
}

export async function listEventCharacters(
  storyId: string,
  eventId?: string,
): Promise<EventCharacterRecord[]> {
  return accountRequest<EventCharacterRecord[]>({
    url: `/api/stories/${storyId}/event-characters`,
    method: "GET",
    params: eventId ? { eventId } : undefined,
  });
}

export async function addEventCharacter(
  storyId: string,
  payload: CreateEventCharacterPayload,
): Promise<EventCharacterRecord> {
  return accountRequest<EventCharacterRecord>({
    url: `/api/stories/${storyId}/event-characters`,
    method: "POST",
    data: payload,
  });
}

export async function removeEventCharacter(
  storyId: string,
  linkId: string,
): Promise<void> {
  await accountRequest<void>({
    url: `/api/stories/${storyId}/event-characters/${linkId}`,
    method: "DELETE",
  });
}
