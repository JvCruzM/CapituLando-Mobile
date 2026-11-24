import { accountRequest } from "../../../shared/api/account";

export interface CharacterRaceOption {
  id: string;
  name: string;
}

export interface CharacterRecord {
  id: string;
  storyId: string;
  raceId?: string | null;
  name: string;
  description?: string | null;
  appearance?: string | null;
  personality?: string | null;
  age?: number | null;
  height?: string | null;
  weight?: string | null;
  zodiac?: string | null;
  bloodType?: string | null;
  gender?: string | null;
  background?: string | null;
  characterImage?: string | null;
  imageFit?: string | null;
  imagePosition?: string | null;
  likes?: string | null;
  dislikes?: string | null;
  drinks?: string | null;
  motto?: string | null;
  role?: string | null;
  mbti?: string | null;
  motivation?: string | null;
  notes?: string | null;
  birthDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveCharacterPayload {
  organizationIds?: string[];
  organizationId?: string | null;
  name: string;
  raceId?: string | null;
  role?: string | null;
  age?: number | null;
  gender?: string | null;
  birthDate?: string | null;
  height?: string | null;
  weight?: string | null;
  zodiac?: string | null;
  bloodType?: string | null;
  mbti?: string | null;
  description?: string | null;
  appearance?: string | null;
  personality?: string | null;
  motivation?: string | null;
  background?: string | null;
  likes?: string | null;
  dislikes?: string | null;
  drinks?: string | null;
  motto?: string | null;
  notes?: string | null;
  characterImage?: string | null;
  imageFit?: string | null;
  imagePosition?: string | null;
}

export async function listCharacters(
  storyId: string,
): Promise<CharacterRecord[]> {
  return accountRequest<CharacterRecord[]>({
    url: `/api/stories/${storyId}/characters`,
    method: "GET",
  });
}

export async function getCharacter(
  storyId: string,
  characterId: string,
): Promise<CharacterRecord> {
  return accountRequest<CharacterRecord>({
    url: `/api/stories/${storyId}/characters/${characterId}`,
    method: "GET",
  });
}

export async function createCharacter(
  storyId: string,
  payload: SaveCharacterPayload,
): Promise<CharacterRecord> {
  return accountRequest<CharacterRecord>({
    url: `/api/stories/${storyId}/characters`,
    method: "POST",
    data: payload,
  });
}

export async function updateCharacter(
  storyId: string,
  characterId: string,
  payload: SaveCharacterPayload,
): Promise<CharacterRecord> {
  return accountRequest<CharacterRecord>({
    url: `/api/stories/${storyId}/characters/${characterId}`,
    method: "PUT",
    data: payload,
  });
}

export async function deleteCharacter(
  storyId: string,
  characterId: string,
): Promise<void> {
  await accountRequest<void>({
    url: `/api/stories/${storyId}/characters/${characterId}`,
    method: "DELETE",
  });
}

export async function listStoryRaces(
  storyId: string,
): Promise<CharacterRaceOption[]> {
  return accountRequest<CharacterRaceOption[]>({
    url: `/api/stories/${storyId}/races`,
    method: "GET",
  });
}
