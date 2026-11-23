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

export const editableCategories = [
  "races",
  "creatures",
  "items",
  "locations",
  "organizations",
  "world-rules",
  "theme",
] as const;
export const categoryFields: Record<
  EncyclopediaCategory,
  Record<string, string>
> = {
  races: { appearance: "Aparência", culture: "Cultura", habitat: "Habitat" },
  creatures: {
    appearance: "Aparência",
    behavior: "Comportamento",
    habitat: "Habitat",
  },
  items: { type: "Tipo", appearance: "Aparência", origin: "Origem" },
  locations: { type: "Tipo", climate: "Clima", region: "Região" },
  organizations: { type: "Tipo", leader: "Líder", philosophy: "Filosofia" },
  "world-rules": { category: "Categoria", scope: "Âmbito", cost: "Custo" },
  theme: { category: "Tipo de Conceito", region: "Região", notes: "Notas" },
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

function extractImage(row: Row): string | null {
  return (
    text(
      row.image ??
      row.imageUrl ??
      row.image_url ??
      row.raceImage ??
      row.race_image ??
      row.creatureImage ??
      row.creature_image ??
      row.itemImage ??
      row.item_image ??
      row.locationImage ??
      row.location_image ??
      row.organizationImage ??
      row.organization_image ??
      row.conceptImage ??
      row.concept_image ??
      row.photo ??
      row.coverImage ??
      row.cover_image,
    ) || null
  );
}

function entry(
  row: Row,
  category: EncyclopediaCategory,
  attributes: Record<string, string>,
  editable = true,
  extra: Partial<EncyclopediaItem> = {},
): EncyclopediaItem {
  return {
    id: text(row.id),
    name: text(row.name ?? row.title),
    category,
    description: text(row.description),
    subtitle: "",
    tags: [],
    attributes,
    image: extractImage(row),
    source: row,
    editable,
    ...extra,
    ...stamp(row),
  };
}

export function mapUniverse(snapshot: Record<string, unknown>): UniverseData {
  const rows = (key: string) =>
    (Array.isArray(snapshot[key]) ? snapshot[key] : []) as Row[];

  const raceNames = new Map(
    rows("races").map((row) => [text(row.id), text(row.name)]),
  );
  const locationNames = new Map(
    rows("locations").map((row) => [text(row.id), text(row.name)]),
  );
  const organizationNames = new Map(
    rows("organizations").map((row) => [text(row.id), text(row.name)]),
  );

  const encyclopediaItems: EncyclopediaItem[] = [];

  for (const row of rows("races")) {
    const attributes = {
      Aparência: text(row.appearance),
      Cultura: text(row.culture),
      Habitat: text(row.habitat),
    };
    encyclopediaItems.push(entry(row, "races", attributes, true));
  }

  for (const row of rows("creatures")) {
    const raceId = text(row.race_id ?? row.raceId) || null;
    const raceName = (raceId && raceNames.get(raceId)) || null;
    const attributes = {
      Aparência: text(row.appearance),
      Comportamento: text(row.behavior),
      Habitat: text(row.habitat),
    };
    encyclopediaItems.push(
      entry(row, "creatures", attributes, true, {
        raceId,
        raceName,
      }),
    );
  }

  for (const row of rows("items")) {
    const attributes = {
      Tipo: text(row.type),
      Aparência: text(row.appearance),
      Origem: text(row.origin),
    };
    encyclopediaItems.push(entry(row, "items", attributes, true));
  }

  for (const row of rows("locations")) {
    const parentLocationId =
      text(
        row.parent_location_id ??
        row.parentLocationId ??
        row.parent_id ??
        row.parentId,
      ) || null;
    const parentLocationName =
      (parentLocationId && locationNames.get(parentLocationId)) || null;
    const attributes = {
      Tipo: text(row.type),
      Clima: text(row.climate),
      Região: text(row.region),
    };
    encyclopediaItems.push(
      entry(row, "locations", attributes, true, {
        parentLocationId,
        parentLocationName,
      }),
    );
  }

  for (const row of rows("organizations")) {
    const headquartersLocationId =
      text(
        row.headquarters_location_id ??
        row.headquartersLocationId ??
        row.headquarters_id ??
        row.headquartersId ??
        row.location_id ??
        row.locationId,
      ) || null;
    const headquartersLocationName =
      (headquartersLocationId &&
        locationNames.get(headquartersLocationId)) ||
      null;
    const attributes = {
      Tipo: text(row.type),
      Líder: text(row.leader),
      Filosofia: text(row.philosophy),
    };
    encyclopediaItems.push(
      entry(row, "organizations", attributes, true, {
        headquartersLocationId,
        headquartersLocationName,
      }),
    );
  }

  for (const row of rows("world_rules")) {
    const attributes = {
      Categoria: text(row.category),
      Âmbito: text(row.scope),
      Custo: text(row.cost),
    };
    encyclopediaItems.push(entry(row, "world-rules", attributes, true));
  }

  for (const row of rows("concepts")) {
    const rawCategory = text(row.category);
    const category: EncyclopediaCategory =
      rawCategory === "Local"
        ? "locations"
        : rawCategory === "Organização"
          ? "organizations"
          : rawCategory === "Regra de Magia"
            ? "world-rules"
            : "theme";
    const attributes: Record<string, string> = {
      "Tipo de Conceito": rawCategory || "Lore/História",
      Região: text(row.region),
      Notas: text(row.notes),
    };
    const parentLocationId =
      text(row.parent_location_id ?? row.parentLocationId ?? row.parent_id) ||
      null;
    const headquartersLocationId =
      text(
        row.headquarters_location_id ??
        row.headquartersLocationId ??
        row.location_id ??
        row.locationId,
      ) || null;

    encyclopediaItems.push(
      entry(row, category, attributes, true, {
        id: `concept:${row.id}`,
        conceptCategory: rawCategory || "Lore/História",
        parentLocationId,
        parentLocationName: parentLocationId
          ? locationNames.get(parentLocationId) || null
          : null,
        headquartersLocationId,
        headquartersLocationName: headquartersLocationId
          ? locationNames.get(headquartersLocationId) || null
          : null,
      }),
    );
  }

  for (const row of rows("universe_notes")) {
    const attributes: Record<string, string> = {
      "Tipo de Conceito": "Lore/História",
      Notas: text(row.content ?? row.notes),
    };
    encyclopediaItems.push(
      entry(row, "theme", attributes, true, {
        id: `note:${row.id}`,
        conceptCategory: "Lore/História",
      }),
    );
  }
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
  return item.editable !== false;
}

export async function saveEncyclopedia(
  storyId: string,
  item: Omit<EncyclopediaItem, "id" | "createdAt" | "updatedAt">,
  original?: EncyclopediaItem,
) {
  const isConcept =
    Boolean(original?.id?.startsWith("concept:")) ||
    Boolean(original?.id?.startsWith("note:")) ||
    item.category === "theme" ||
    Boolean(item.conceptCategory);

  const conceptId = original?.id
    ? original.id.replace(/^(concept|note):/, "")
    : undefined;

  const data: Row = {
    name: item.name,
    title: item.name,
    description: item.description,
  };

  const fields = categoryFields[item.category] ?? {};
  for (const [field, label] of Object.entries(fields)) {
    if (item.attributes[label] !== undefined) {
      data[field] = item.attributes[label] ?? null;
    }
  }

  const chosenImage = item.image ?? null;
  data.image = chosenImage;
  data.imageUrl = chosenImage;
  data.image_url = chosenImage;

  if (item.category === "races") {
    data.raceImage = chosenImage;
    data.race_image = chosenImage;
  } else if (item.category === "creatures") {
    data.creatureImage = chosenImage;
    data.creature_image = chosenImage;
    data.raceId = item.raceId ?? null;
    data.race_id = item.raceId ?? null;
  } else if (item.category === "items") {
    data.itemImage = chosenImage;
    data.item_image = chosenImage;
  } else if (item.category === "locations") {
    data.locationImage = chosenImage;
    data.location_image = chosenImage;
    data.parentLocationId = item.parentLocationId ?? null;
    data.parent_location_id = item.parentLocationId ?? null;
  } else if (item.category === "organizations") {
    data.organizationImage = chosenImage;
    data.organization_image = chosenImage;
    data.headquartersLocationId = item.headquartersLocationId ?? null;
    data.headquarters_location_id = item.headquartersLocationId ?? null;
    data.locationId = item.headquartersLocationId ?? null;
  }

  if (isConcept) {
    const rawCategory =
      item.conceptCategory ||
      item.attributes["Tipo de Conceito"] ||
      (item.category === "locations"
        ? "Local"
        : item.category === "organizations"
          ? "Organização"
          : item.category === "world-rules"
            ? "Regra de Magia"
            : "Lore/História");
    data.category = rawCategory;
    data.region = item.attributes["Região"] ?? null;
    data.notes = item.attributes["Notas"] ?? null;
    data.conceptImage = chosenImage;

    const url = `/api/stories/${storyId}/concepts${conceptId ? `/${conceptId}` : ""}`;
    try {
      await accountRequest({
        url,
        method: conceptId ? "PUT" : "POST",
        data,
      });
      return;
    } catch (cause) {
      if (!conceptId && item.category !== "theme") {
        await accountRequest({
          url: `/api/stories/${storyId}/${item.category === "world-rules" ? "world-rules" : item.category}`,
          method: "POST",
          data,
        });
        return;
      }
      throw cause;
    }
  }

  const endpoint =
    item.category === "world-rules" ? "world-rules" : item.category;
  try {
    await accountRequest({
      url: `/api/stories/${storyId}/${endpoint}${original ? `/${original.id}` : ""}`,
      method: original ? "PUT" : "POST",
      data,
    });
  } catch (err: unknown) {
    if (item.category === "world-rules") {
      await accountRequest({
        url: `/api/stories/${storyId}/world_rules${original ? `/${original.id}` : ""}`,
        method: original ? "PUT" : "POST",
        data,
      });
      return;
    }
    throw err;
  }
}

export async function deleteEncyclopedia(
  storyId: string,
  item: EncyclopediaItem,
) {
  if (!canEditEntry(item))
    throw new Error("A exclusão desta categoria ainda não está disponível.");

  if (item.id.startsWith("concept:")) {
    const conceptId = item.id.replace(/^concept:/, "");
    return accountRequest({
      url: `/api/stories/${storyId}/concepts/${conceptId}`,
      method: "DELETE",
    });
  }

  if (item.id.startsWith("note:")) {
    const noteId = item.id.replace(/^note:/, "");
    return accountRequest({
      url: `/api/stories/${storyId}/universe-notes/${noteId}`,
      method: "DELETE",
    });
  }

  const endpoint =
    item.category === "world-rules" ? "world-rules" : item.category;
  try {
    return await accountRequest({
      url: `/api/stories/${storyId}/${endpoint}/${item.id}`,
      method: "DELETE",
    });
  } catch (err: unknown) {
    if (item.category === "world-rules") {
      return await accountRequest({
        url: `/api/stories/${storyId}/world_rules/${item.id}`,
        method: "DELETE",
      });
    }
    throw err;
  }
}
