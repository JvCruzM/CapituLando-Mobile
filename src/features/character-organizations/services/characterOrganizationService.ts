import { accountRequest } from "../../../shared/api/account";

export interface OrganizationOption {
  id: string;
  name: string;
  type?: string | null;
}

export interface CharacterOrganizationRecord {
  id: string;
  storyId: string;
  characterId: string;
  organizationId: string;
  role?: string | null;
  joinedAt?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCharacterOrganizationPayload {
  characterId: string;
  organizationId: string;
  role?: string | null;
  joinedAt?: string | null;
  isActive?: boolean;
}

export interface UpdateCharacterOrganizationPayload {
  role?: string | null;
  joinedAt?: string | null;
  isActive?: boolean;
}

export async function listStoryOrganizations(
  storyId: string,
): Promise<OrganizationOption[]> {
  return accountRequest<OrganizationOption[]>({
    url: `/api/stories/${storyId}/organizations`,
    method: "GET",
  });
}

export async function listCharacterOrganizations(
  storyId: string,
  characterId?: string,
): Promise<CharacterOrganizationRecord[]> {
  return accountRequest<CharacterOrganizationRecord[]>({
    url: `/api/stories/${storyId}/character-organizations`,
    method: "GET",
    params: characterId ? { characterId } : undefined,
  });
}

export async function createCharacterOrganization(
  storyId: string,
  payload: CreateCharacterOrganizationPayload,
): Promise<CharacterOrganizationRecord> {
  return accountRequest<CharacterOrganizationRecord>({
    url: `/api/stories/${storyId}/character-organizations`,
    method: "POST",
    data: payload,
  });
}

export async function updateCharacterOrganization(
  storyId: string,
  linkId: string,
  payload: UpdateCharacterOrganizationPayload,
): Promise<CharacterOrganizationRecord> {
  return accountRequest<CharacterOrganizationRecord>({
    url: `/api/stories/${storyId}/character-organizations/${linkId}`,
    method: "PUT",
    data: payload,
  });
}

export async function deleteCharacterOrganization(
  storyId: string,
  linkId: string,
): Promise<void> {
  await accountRequest<void>({
    url: `/api/stories/${storyId}/character-organizations/${linkId}`,
    method: "DELETE",
  });
}
