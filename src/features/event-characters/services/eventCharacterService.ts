import { accountRequest } from "../../../shared/api/account";

export interface EventCharacterRecord {
  id: string;
  story: { id: string };
  event: { id: string };
  character: { id: string };
  createdAt?: string;
}

export interface CreateEventCharacterPayload {
  story: { id: string };
  event: { id: string };
  character: { id: string };
}

export async function listEventCharacters(storyId: string): Promise<EventCharacterRecord[]> {
  return accountRequest<EventCharacterRecord[]>("/world/event-characters", {
    query: { storyId },
  });
}

export async function addEventCharacter(
  payload: CreateEventCharacterPayload
): Promise<EventCharacterRecord> {
  return accountRequest<EventCharacterRecord>("/world/event-characters", {
    method: "POST",
    body: payload,
  });
}

export async function removeEventCharacter(id: string): Promise<void> {
  await accountRequest<void>(`/world/event-characters/${id}`, {
    method: "DELETE",
  });
}
