import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEvent,
  deleteEvent,
  listEvents,
  listStoryLocations,
  type SaveEventPayload,
  updateEvent,
} from "../../events/services/eventService";
import {
  addEventCharacter,
  listEventCharacters,
  removeEventCharacter,
} from "../../event-characters/services/eventCharacterService";
import {
  createFreeChronologyEntry,
  deleteFreeChronologyEntry,
  listFreeChronology,
  type SaveFreeChronologyPayload,
  updateFreeChronologyEntry,
} from "../services/timelineNoteService";
import { universeKey } from "../../universe/services/universe-api";

export const eventsQueryKey = (ownerId: string, storyId: string) =>
  ["story-events", ownerId, storyId] as const;

export function useTimelineWorkspace(ownerId: string, storyId: string) {
  const queryClient = useQueryClient();
  const enabled = Boolean(ownerId && storyId);

  const eventsQuery = useQuery({
    queryKey: eventsQueryKey(ownerId, storyId),
    queryFn: () => listEvents(storyId),
    enabled,
  });

  const locationsQuery = useQuery({
    queryKey: ["story-locations", ownerId, storyId],
    queryFn: () => listStoryLocations(storyId),
    enabled,
  });

  const eventCharactersQuery = useQuery({
    queryKey: ["story-event-characters", ownerId, storyId],
    queryFn: () => listEventCharacters(storyId),
    enabled,
  });

  const freeChronologyQuery = useQuery({
    queryKey: ["story-free-chronology", ownerId, storyId],
    queryFn: () => listFreeChronology(storyId),
    enabled,
  });

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: eventsQueryKey(ownerId, storyId),
      }),
      queryClient.invalidateQueries({
        queryKey: ["story-event-characters", ownerId, storyId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["story-free-chronology", ownerId, storyId],
      }),
      queryClient.invalidateQueries({
        queryKey: universeKey(ownerId, storyId),
      }),
    ]);
  };

  const saveEventMutation = useMutation({
    mutationFn: async ({
      eventId,
      payload,
      characterIds,
    }: {
      eventId?: string;
      payload: SaveEventPayload;
      characterIds?: string[];
    }) => {
      const data = { ...payload, characterIds };
      const saved = eventId
        ? await updateEvent(storyId, eventId, data)
        : await createEvent(storyId, data);

      return saved;
    },
    onSuccess: invalidateAll,
  });

  const removeEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const existingLinks = (eventCharactersQuery.data ?? []).filter(
        (link) => link.eventId === eventId,
      );
      for (const link of existingLinks) {
        await removeEventCharacter(storyId, link.id);
      }
      await deleteEvent(storyId, eventId);
    },
    onSuccess: invalidateAll,
  });

  const saveFreeNoteMutation = useMutation({
    mutationFn: async ({
      entryId,
      payload,
    }: {
      entryId?: string;
      payload: SaveFreeChronologyPayload;
    }) => {
      if (entryId) {
        return updateFreeChronologyEntry(storyId, entryId, payload);
      }
      return createFreeChronologyEntry(storyId, payload);
    },
    onSuccess: invalidateAll,
  });

  const removeFreeNoteMutation = useMutation({
    mutationFn: (entryId: string) =>
      deleteFreeChronologyEntry(storyId, entryId),
    onSuccess: invalidateAll,
  });

  return {
    events: eventsQuery.data ?? [],
    locations: locationsQuery.data ?? [],
    eventCharacters: eventCharactersQuery.data ?? [],
    freeChronology: freeChronologyQuery.data ?? [],
    error:
      eventsQuery.error ??
      locationsQuery.error ??
      eventCharactersQuery.error ??
      freeChronologyQuery.error,
    retry: () =>
      Promise.all([
        eventsQuery.refetch(),
        locationsQuery.refetch(),
        eventCharactersQuery.refetch(),
        freeChronologyQuery.refetch(),
      ]),
    isLoading:
      eventsQuery.isLoading ||
      locationsQuery.isLoading ||
      eventCharactersQuery.isLoading ||
      freeChronologyQuery.isLoading,
    saveEvent: saveEventMutation.mutateAsync,
    removeEvent: removeEventMutation.mutateAsync,
    saveFreeNote: saveFreeNoteMutation.mutateAsync,
    removeFreeNote: removeFreeNoteMutation.mutateAsync,
    isMutating:
      saveEventMutation.isPending ||
      removeEventMutation.isPending ||
      saveFreeNoteMutation.isPending ||
      removeFreeNoteMutation.isPending,
  };
}
