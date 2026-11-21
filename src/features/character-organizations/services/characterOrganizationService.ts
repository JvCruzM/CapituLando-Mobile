import { accountRequest } from "../../../shared/api/account";

export interface OrganizationOption {
  id: string;
  name: string;
  type?: string | null;
}

export interface CharacterOrganizationRecord {
  id: string;
  story: { id: string };
  character: { id: string };
  organization: { id: string };
  role?: string | null;
  joinedAt?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveCharacterOrganizationPayload {
  story: { id: string };
  character: { id: string };
  organization: { id: string };
  role?: string | null;
  joinedAt?: string | null;
  isActive: boolean;
}

export async function listStoryOrganizations(storyId: string): Promise<OrganizationOption[]> {
  return accountRequest<OrganizationOption[]>("/world/organizations", {
    query: { storyId },
  });
}

export async function listCharacterOrganizations(
  storyId: string
): Promise<CharacterOrganizationRecord[]> {
  return accountRequest<CharacterOrganizationRecord[]>("/world/character-organizations", {
    query: { storyId },
  });
}

export async function createCharacterOrganization(
  payload: SaveCharacterOrganizationPayload
): Promise<CharacterOrganizationRecord> {
  return accountRequest<CharacterOrganizationRecord>("/world/character-organizations", {
    method: "POST",
    body: payload,
  });
}

export async function updateCharacterOrganization(
  id: string,
  payload: SaveCharacterOrganizationPayload
): Promise<CharacterOrganizationRecord> {
  return accountRequest<CharacterOrganizationRecord>(`/world/character-organizations/${id}`, {
    method: "PUT",
    body: payload,
  });
}

export async function deleteCharacterOrganization(id: string): Promise<void> {
  await accountRequest<void>(`/world/character-organizations/${id}`, {
    method: "DELETE",
  });
}
