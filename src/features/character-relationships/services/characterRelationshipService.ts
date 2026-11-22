import { accountRequest } from "../../../shared/api/account";

export interface CharacterRelationshipRecord {
  id: string;
  storyId: string;
  sourceCharacterId: string;
  targetCharacterId: string;
  type: string;
  description?: string | null;
  level?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveCharacterRelationshipPayload {
  sourceCharacterId: string;
  targetCharacterId: string;
  type: string;
  description?: string | null;
  level?: number | null;
}

export async function listCharacterRelationships(
  storyId: string,
): Promise<CharacterRelationshipRecord[]> {
  return accountRequest<CharacterRelationshipRecord[]>({
    url: `/api/stories/${storyId}/character-relationships`,
    method: "GET",
  });
}

export async function createCharacterRelationship(
  storyId: string,
  payload: SaveCharacterRelationshipPayload,
): Promise<CharacterRelationshipRecord> {
  return accountRequest<CharacterRelationshipRecord>({
    url: `/api/stories/${storyId}/character-relationships`,
    method: "POST",
    data: payload,
  });
}

export async function updateCharacterRelationship(
  storyId: string,
  relationshipId: string,
  payload: SaveCharacterRelationshipPayload,
): Promise<CharacterRelationshipRecord> {
  return accountRequest<CharacterRelationshipRecord>({
    url: `/api/stories/${storyId}/character-relationships/${relationshipId}`,
    method: "PUT",
    data: payload,
  });
}

export async function deleteCharacterRelationship(
  storyId: string,
  relationshipId: string,
): Promise<void> {
  await accountRequest<void>({
    url: `/api/stories/${storyId}/character-relationships/${relationshipId}`,
    method: "DELETE",
  });
}
