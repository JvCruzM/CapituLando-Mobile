import AsyncStorage from "@react-native-async-storage/async-storage";

export interface TimelineFreeNote {
  id: string;
  storyId: string;
  eraLabel: string;
  title: string;
  content: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

function storageKey(storyId: string): string {
  return `@capitulando:timeline-notes:${storyId}`;
}

export async function listTimelineNotes(storyId: string): Promise<TimelineFreeNote[]> {
  const raw = await AsyncStorage.getItem(storageKey(storyId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as TimelineFreeNote[];
    return Array.isArray(parsed)
      ? [...parsed].sort((a, b) => a.order - b.order)
      : [];
  } catch {
    return [];
  }
}

export async function saveTimelineNote(
  storyId: string,
  note: Omit<TimelineFreeNote, "id" | "storyId" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<TimelineFreeNote[]> {
  const current = await listTimelineNotes(storyId);
  const now = new Date().toISOString();

  let updated: TimelineFreeNote[];
  if (note.id) {
    updated = current.map((item) =>
      item.id === note.id
        ? {
            ...item,
            eraLabel: note.eraLabel,
            title: note.title,
            content: note.content,
            order: note.order,
            updatedAt: now,
          }
        : item
    );
  } else {
    const created: TimelineFreeNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      storyId,
      eraLabel: note.eraLabel,
      title: note.title,
      content: note.content,
      order: note.order,
      createdAt: now,
      updatedAt: now,
    };
    updated = [...current, created];
  }

  updated.sort((a, b) => a.order - b.order);
  await AsyncStorage.setItem(storageKey(storyId), JSON.stringify(updated));
  return updated;
}

export async function deleteTimelineNote(
  storyId: string,
  noteId: string
): Promise<TimelineFreeNote[]> {
  const current = await listTimelineNotes(storyId);
  const updated = current.filter((item) => item.id !== noteId);
  await AsyncStorage.setItem(storageKey(storyId), JSON.stringify(updated));
  return updated;
}
