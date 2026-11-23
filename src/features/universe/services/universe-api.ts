import { accountRequest } from "../../../shared/api/account";
import type {
  EncyclopediaCategory,
  EncyclopediaItem,
  CharacterItem,
  TimelineEventItem,
} from "../types";

type Row = Record<string, unknown>;
export interface StoryOption {
  id: string;
  title: string;
}
export interface UniverseData {
  encyclopediaItems: EncyclopediaItem[];
  characters: CharacterItem[];
  timelineEvents: TimelineEventItem[];
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
] as const;
export const categoryFields: Partial<
  Record<EncyclopediaCategory, Record<string, string>>
> = {
  locations: { type: "Tipo", climate: "Clima", region: "Região" },
  organizations: { type: "Tipo" },
  "world-rules": { category: "Categoria" },
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
    for (const row of rows(category.replaceAll("-", "_"))) {
      const attributes = Object.fromEntries(
        Object.entries(categoryFields[category]!).map(([field, label]) => [
          label,
          text(row[field]),
        ]),
      );
      encyclopediaItems.push(entry(row, category, attributes, true));
    }
  }
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
    rows("races").map((row) => [row.id, text(row.name)]),
  );
  const organizations = new Map(
    rows("organizations").map((row) => [row.id, text(row.name)]),
  );
  const characters: CharacterItem[] = rows("characters").map((row) => ({
    id: text(row.id),
    name: text(row.name),
    role: (text(row.role) as CharacterItem["role"]) || "Secundário",
    race: raceNames.get(row.race_id) ?? "Sem raça vinculada",
    organization: rows("character_organizations")
      .filter(
        (link) => link.character_id === row.id && link.is_active !== false,
      )
      .map((link) => organizations.get(link.organization_id))
      .filter(Boolean)
      .join(", "),
    occupation: "",
    archetype: "",
    appearance: text(row.appearance),
    personality: text(row.personality),
    motivation: text(row.motivation),
    internalConflict: "",
    backstory: text(row.background),
    notes: text(row.notes),
    traits: [],
    quote: text(row.motto),
    ...stamp(row),
  }));
  const characterNames = new Map(characters.map((row) => [row.id, row.name]));
  const locations = new Map(
    rows("locations").map((row) => [row.id, text(row.name)]),
  );
  const timelineEvents: TimelineEventItem[] = rows("events").map((row) => ({
    id: text(row.id),
    title: text(row.title),
    era: text(row.chronological_date).includes(" • ")
      ? text(row.chronological_date).split(" • ")[0]!
      : "Cronologia da história",
    dateOrder: typeof row.sequence_order === "number" ? row.sequence_order : 0,
    dateDisplay: text(row.chronological_date)
      .split(" • ")
      .slice(text(row.chronological_date).includes(" • ") ? 1 : 0)
      .join(" • "),
    importance: "Maior",
    summary: text(row.description),
    description: text(row.description),
    location: locations.get(row.location_id),
    charactersInvolved: rows("event_characters")
      .filter((link) => link.event_id === row.id)
      .map((link) => characterNames.get(text(link.character_id)))
      .filter((name): name is string => Boolean(name)),
    ...stamp(row),
  }));
  for (const row of rows("chronology"))
    timelineEvents.push({
      id: `chronology:${row.id}`,
      title: text(row.title),
      era: text(row.yearOrDate).includes(" • ")
        ? text(row.yearOrDate).split(" • ")[0]!
        : "Cronologia livre",
      dateOrder: typeof row.order === "number" ? row.order : 0,
      dateDisplay: text(row.yearOrDate)
        .split(" • ")
        .slice(text(row.yearOrDate).includes(" • ") ? 1 : 0)
        .join(" • "),
      location: text(row.location) || undefined,
      importance: "Maior",
      summary: text(row.description),
      description: text(row.description),
      charactersInvolved: text(row.characters) ? [text(row.characters)] : [],
      ...stamp(row),
    });
  return { encyclopediaItems, characters, timelineEvents };
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
  const data: Row = {
    [item.category === "world-rules" ? "title" : "name"]: item.name,
    description: item.description,
  };
  for (const [field, label] of Object.entries(fields))
    data[field] = item.attributes[label] ?? null;
  const source = original?.source ?? {};
  if (item.category === "locations") {
    data.parentLocationId = source.parent_location_id ?? null;
    data.locationImage = source.location_image ?? null;
  }
  if (item.category === "organizations") {
    data.headquartersLocationId = source.headquarters_location_id ?? null;
    data.organizationImage = source.organization_image ?? null;
  }
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
