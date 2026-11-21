import { accountRequest } from "../../../shared/api/account";

export interface CharacterRaceOption {
  id: string;
  name: string;
}

export interface CharacterRecord {
  id: string;
  story?: { id: string } | null;
  race?: { id: string } | null;
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
  story: { id: string };
  race: { id: string } | null;
  raceProvided?: boolean;
  name: string;
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
}

export async function listCharacters(storyId: string): Promise<CharacterRecord[]> {
  return accountRequest<CharacterRecord[]>("/characters", {
    query: { storyId },
  });
}

export async function createCharacter(payload: SaveCharacterPayload): Promise<CharacterRecord> {
  return accountRequest<CharacterRecord>("/characters", {
    method: "POST",
    body: payload,
  });
}

export async function updateCharacter(
  characterId: string,
  payload: SaveCharacterPayload
): Promise<CharacterRecord> {
  return accountRequest<CharacterRecord>(`/characters/${characterId}`, {
    method: "PUT",
    body: {
      ...payload,
      raceProvided: true,
    },
  });
}

export async function deleteCharacter(characterId: string): Promise<void> {
  await accountRequest<void>(`/characters/${characterId}`, {
    method: "DELETE",
  });
}

export async function listStoryRaces(storyId: string): Promise<CharacterRaceOption[]> {
  return accountRequest<CharacterRaceOption[]>("/races", {
    query: { storyId },
  });
}
