import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCharacter,
  deleteCharacter,
  listCharacters,
  listStoryRaces,
  type SaveCharacterPayload,
  updateCharacter,
} from "../services/characterService";
import {
  createCharacterOrganization,
  deleteCharacterOrganization,
  listCharacterOrganizations,
  listStoryOrganizations,
  type CreateCharacterOrganizationPayload,
  type UpdateCharacterOrganizationPayload,
  updateCharacterOrganization,
} from "../../character-organizations/services/characterOrganizationService";
import {
  createCharacterRelationship,
  deleteCharacterRelationship,
  listCharacterRelationships,
  type SaveCharacterRelationshipPayload,
  updateCharacterRelationship,
} from "../../character-relationships/services/characterRelationshipService";
import { universeKey } from "../../universe/services/universe-api";

export const charactersQueryKey = (storyId: string) =>
  ["story-characters", storyId] as const;

export function useCharactersWorkspace(ownerId: string, storyId: string) {
  const queryClient = useQueryClient();
  const enabled = Boolean(ownerId && storyId);

  const charactersQuery = useQuery({
    queryKey: charactersQueryKey(storyId),
    queryFn: () => listCharacters(storyId),
    enabled,
  });

  const racesQuery = useQuery({
    queryKey: ["story-races", storyId],
    queryFn: () => listStoryRaces(storyId),
    enabled,
  });

  const organizationsQuery = useQuery({
    queryKey: ["story-organizations", storyId],
    queryFn: () => listStoryOrganizations(storyId),
    enabled,
  });

  const characterOrganizationsQuery = useQuery({
    queryKey: ["story-character-organizations", storyId],
    queryFn: () => listCharacterOrganizations(storyId),
    enabled,
  });

  const relationshipsQuery = useQuery({
    queryKey: ["story-character-relationships", storyId],
    queryFn: () => listCharacterRelationships(storyId),
    enabled,
  });

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: charactersQueryKey(storyId) }),
      queryClient.invalidateQueries({
        queryKey: ["story-character-organizations", storyId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["story-character-relationships", storyId],
      }),
      queryClient.invalidateQueries({
        queryKey: universeKey(ownerId, storyId),
      }),
    ]);
  };

  const saveCharacterMutation = useMutation({
    mutationFn: async ({
      characterId,
      payload,
    }: {
      characterId?: string;
      payload: SaveCharacterPayload;
    }) => {
      if (characterId) {
        return updateCharacter(storyId, characterId, payload);
      }
      return createCharacter(storyId, payload);
    },
    onSuccess: invalidateAll,
  });

  const removeCharacterMutation = useMutation({
    mutationFn: (characterId: string) => deleteCharacter(storyId, characterId),
    onSuccess: invalidateAll,
  });

  const addOrganizationLinkMutation = useMutation({
    mutationFn: (payload: CreateCharacterOrganizationPayload) =>
      createCharacterOrganization(storyId, payload),
    onSuccess: invalidateAll,
  });

  const updateOrganizationLinkMutation = useMutation({
    mutationFn: ({
      linkId,
      payload,
    }: {
      linkId: string;
      payload: UpdateCharacterOrganizationPayload;
    }) => updateCharacterOrganization(storyId, linkId, payload),
    onSuccess: invalidateAll,
  });

  const removeOrganizationLinkMutation = useMutation({
    mutationFn: (linkId: string) =>
      deleteCharacterOrganization(storyId, linkId),
    onSuccess: invalidateAll,
  });

  const saveRelationshipMutation = useMutation({
    mutationFn: async ({
      relationshipId,
      payload,
    }: {
      relationshipId?: string;
      payload: SaveCharacterRelationshipPayload;
    }) => {
      if (relationshipId) {
        return updateCharacterRelationship(storyId, relationshipId, payload);
      }
      return createCharacterRelationship(storyId, payload);
    },
    onSuccess: invalidateAll,
  });

  const removeRelationshipMutation = useMutation({
    mutationFn: (relationshipId: string) =>
      deleteCharacterRelationship(storyId, relationshipId),
    onSuccess: invalidateAll,
  });

  return {
    characters: charactersQuery.data ?? [],
    races: racesQuery.data ?? [],
    organizations: organizationsQuery.data ?? [],
    characterOrganizations: characterOrganizationsQuery.data ?? [],
    relationships: relationshipsQuery.data ?? [],
    isLoading:
      charactersQuery.isLoading ||
      racesQuery.isLoading ||
      organizationsQuery.isLoading,
    saveCharacter: saveCharacterMutation.mutateAsync,
    removeCharacter: removeCharacterMutation.mutateAsync,
    addOrganizationLink: addOrganizationLinkMutation.mutateAsync,
    updateOrganizationLink: updateOrganizationLinkMutation.mutateAsync,
    removeOrganizationLink: removeOrganizationLinkMutation.mutateAsync,
    saveRelationship: saveRelationshipMutation.mutateAsync,
    removeRelationship: removeRelationshipMutation.mutateAsync,
    isMutating:
      saveCharacterMutation.isPending ||
      removeCharacterMutation.isPending ||
      addOrganizationLinkMutation.isPending ||
      updateOrganizationLinkMutation.isPending ||
      removeOrganizationLinkMutation.isPending ||
      saveRelationshipMutation.isPending ||
      removeRelationshipMutation.isPending,
  };
}
