import { accountRequest } from "../../../shared/api/account";
import type {
  EncyclopediaCategory,
  EncyclopediaItem,
  CharacterItem,
  CharacterImageFit,
  CharacterImagePosition,
  TimelineEventItem,
} from "../types";

type Row = Record<string, unknown>;
export interface StoryOption {
  id: string;
  title: string;
}
export interface UniverseChapterOption {
  id: string;
  title: string;
  orderIndex?: number | null;
}
export interface UniverseData {
  encyclopediaItems: EncyclopediaItem[];
  characters: CharacterItem[];
  timelineEvents: TimelineEventItem[];
  chapters: UniverseChapterOption[];
}
const text = (value: unknown) => (typeof value === "string" ? value : "");
const stamp = (row: Row) => ({
  createdAt: text(row.created_at),
  updatedAt: text(row.updated_at),
});

export const editableCategories = ["races", "creatures", "items"] as const;
export const categoryFields: Partial<
  Record<EncyclopediaCategory, Record<string, string>>
> = {
  races: { appearance: "Aparência", culture: "Cultura", habitat: "Habitat" },
  creatures: {
    appearance: "Aparência",
    behavior: "Comportamento",
    habitat: "Habitat",
  },
  items: { type: "Tipo", appearance: "Aparência", origin: "Origem" },
};
export function emptyAttributes(category: EncyclopediaCategory) {
  return Object.fromEntries(
    Object.values(categoryFields[category] ?? {}).map((label) => [label, ""]),
  );
}
export const universeKey = (ownerId: string, storyId: string) =>
  ["universe", ownerId, storyId] as const;
export const storiesKey = (ownerId: string) =>
  ["universe-stories", ownerId] as const;
export const loadUniverseStories = (signal: AbortSignal) =>
  accountRequest<StoryOption[]>({ url: "/api/universe/stories", signal });

function entry(
  row: Row,
  category: EncyclopediaCategory,
  attributes: Record<string, string>,
  editable = false,
): EncyclopediaItem {
  return {
    id: text(row.id),
    name: text(row.name ?? row.title),
    category,
    description: text(row.description),
    subtitle: "",
    tags: [],
    attributes,
    source: row,
    editable,
    ...stamp(row),
  };
}

export function mapUniverse(snapshot: Record<string, unknown>): UniverseData {
  const rows = (key: string) =>
    (Array.isArray(snapshot[key]) ? snapshot[key] : []) as Row[];
  const encyclopediaItems: EncyclopediaItem[] = [];
  for (const category of editableCategories) {
    for (const row of rows(category)) {
      const attributes = Object.fromEntries(
        Object.entries(categoryFields[category]!).map(([field, label]) => [
          label,
          text(row[field]),
        ]),
      );
      encyclopediaItems.push(entry(row, category, attributes, true));
    }
  }
  for (const row of rows("locations"))
    encyclopediaItems.push(
      entry(row, "locations", {
        Tipo: text(row.type),
        Clima: text(row.climate),
        Região: text(row.region),
      }),
    );
  for (const row of rows("organizations"))
    encyclopediaItems.push(
      entry(row, "organizations", { Tipo: text(row.type) }),
    );
  for (const row of rows("world_rules"))
    encyclopediaItems.push(
      entry(row, "world-rules", { Categoria: text(row.category) }),
    );
  for (const row of rows("concepts")) {
    const category =
      row.category === "Local"
        ? "locations"
        : row.category === "Organização"
          ? "organizations"
          : row.category === "Regra de Magia"
            ? "world-rules"
            : "theme";
    encyclopediaItems.push(
      entry({ ...row, id: `concept:${row.id}` }, category, {
        Região: text(row.region),
        Notas: text(row.notes),
      }),
    );
  }
  const raceNames = new Map(
    rows("races").map((row) => [text(row.id), text(row.name)]),
  );
  const organizations = new Map(
    rows("organizations").map((row) => [text(row.id), text(row.name)]),
  );
  const characters: CharacterItem[] = rows("characters").map((row) => {
    const raceId = text(row.race_id) || null;
    const activeOrgLinks = rows("character_organizations").filter(
      (link) => link.character_id === row.id && link.is_active !== false,
    );
    const organizationIds = activeOrgLinks
      .map((link) => text(link.organization_id))
      .filter(Boolean);
    const fitRaw = text(row.image_fit);
    const posRaw = text(row.image_position);

    return {
      id: text(row.id),
      name: text(row.name),
      role: (text(row.role) as CharacterItem["role"]) || "Secundário",
      raceId,
      race: (raceId && raceNames.get(raceId)) || "Sem raça vinculada",
      organizationIds,
      organization: organizationIds
        .map((orgId) => organizations.get(orgId))
        .filter(Boolean)
        .join(", "),
      occupation: "",
      archetype: "",
      age: typeof row.age === "number" ? row.age : null,
      height: text(row.height),
      weight: text(row.weight),
      zodiac: text(row.zodiac),
      bloodType: text(row.blood_type),
      mbti: text(row.mbti),
      likes: text(row.likes),
      dislikes: text(row.dislikes),
      drinks: text(row.drinks),
      characterImage: text(row.character_image) || null,
      imageFit:
        fitRaw === "contain" || fitRaw === "cover"
          ? (fitRaw as CharacterImageFit)
          : "cover",
      imagePosition:
        posRaw === "top" || posRaw === "bottom" || posRaw === "center"
          ? (posRaw as CharacterImagePosition)
          : "center",
      appearance: text(row.appearance),
      personality: text(row.personality),
      motivation: text(row.motivation),
      internalConflict: "",
      backstory: text(row.background),
      traits: [],
      quote: text(row.motto),
      ...stamp(row),
    };
  });
  const characterNames = new Map(characters.map((row) => [row.id, row.name]));
  const locations = new Map(
    rows("locations").map((row) => [text(row.id), text(row.name)]),
  );
  const chapters: UniverseChapterOption[] = rows("chapters").map((row) => ({
    id: text(row.id),
    title: text(row.title) || "Capítulo sem título",
    orderIndex:
      typeof row.order_index === "number" ? row.order_index : null,
  }));
  const chapterNames = new Map(chapters.map((ch) => [ch.id, ch.title]));

  const timelineEvents: TimelineEventItem[] = rows("events").map((row) => {
    const locationId = text(row.location_id) || null;
    const chapterId = text(row.chapter_id) || null;
    const participantLinks = rows("event_characters").filter(
      (link) => link.event_id === row.id,
    );
    const characterIds = participantLinks
      .map((link) => text(link.character_id))
      .filter(Boolean);

    return {
      id: text(row.id),
      title: text(row.title),
      era: chapterId ? "Evento de capítulo" : "Cronologia da história",
      dateOrder:
        typeof row.sequence_order === "number" ? row.sequence_order : 0,
      dateDisplay: text(row.chronological_date),
      importance: "Maior",
      summary: text(row.description),
      description: text(row.description),
      chapterId,
      chapterTitle: chapterId ? chapterNames.get(chapterId) : undefined,
      locationId,
      location: locationId ? locations.get(locationId) : undefined,
      characterIds,
      charactersInvolved: characterIds
        .map((charId) => characterNames.get(charId))
        .filter((name): name is string => Boolean(name)),
      eventImage: text(row.event_image) || null,
      ...stamp(row),
    };
  });
  for (const row of rows("chronology"))
    timelineEvents.push({
      id: `chronology:${row.id}`,
      title: text(row.title),
      era: "Cronologia livre",
      dateOrder: 0,
      dateDisplay: text(row.yearOrDate),
      importance: "Maior",
      summary: text(row.description),
      description: text(row.description),
      charactersInvolved: text(row.characters) ? [text(row.characters)] : [],
      ...stamp(row),
    });
  return { encyclopediaItems, characters, timelineEvents, chapters };
}

export async function loadUniverse(storyId: string, signal: AbortSignal) {
  const snapshot = await accountRequest<Record<string, unknown>>({
    url: `/api/universe/stories/${storyId}`,
    signal,
  });
  return mapUniverse(snapshot);
}

export function canEditEntry(item: EncyclopediaItem) {
  return (
    item.editable === true &&
    editableCategories.some((category) => category === item.category)
  );
}

export async function saveEncyclopedia(
  storyId: string,
  item: Omit<EncyclopediaItem, "id" | "createdAt" | "updatedAt">,
  original?: EncyclopediaItem,
) {
  const fields = categoryFields[item.category];
  if (
    !fields ||
    (original &&
      (!canEditEntry(original) || original.category !== item.category))
  )
    throw new Error("A edição desta categoria ainda não está disponível.");
  const data: Row = { name: item.name, description: item.description };
  for (const [field, label] of Object.entries(fields))
    data[field] = item.attributes[label] ?? null;
  const source = original?.source ?? {};
  if (item.category === "races") data.raceImage = source.race_image ?? null;
  if (item.category === "creatures") {
    data.creatureImage = source.creature_image ?? null;
    data.raceId = source.race_id ?? null;
  }
  if (item.category === "items") data.itemImage = source.item_image ?? null;
  await accountRequest({
    url: `/api/stories/${storyId}/${item.category}${original ? `/${original.id}` : ""}`,
    method: original ? "PUT" : "POST",
    data,
  });
}

export function deleteEncyclopedia(storyId: string, item: EncyclopediaItem) {
  if (!canEditEntry(item))
    throw new Error("A exclusão desta categoria ainda não está disponível.");
  return accountRequest({
    url: `/api/stories/${storyId}/${item.category}/${item.id}`,
    method: "DELETE",
  });
}
