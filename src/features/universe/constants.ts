import type { EncyclopediaCategory, CharacterRole, TimelineImportance } from "./types";

export interface CategoryMeta {
  key: EncyclopediaCategory;
  label: string;
  singular: string;
  icon: string;
  description: string;
  color: string;
}

export const ENCYCLOPEDIA_CATEGORIES: CategoryMeta[] = [
  {
    key: "races",
    label: "Raças",
    singular: "Raça",
    icon: "dna",
    description: "Espécies e povos inteligentes que habitam o universo",
    color: "#8e44ad",
  },
  {
    key: "creatures",
    label: "Criaturas",
    singular: "Criatura",
    icon: "paw",
    description: "Monstros, feras místicas e fauna fantástica",
    color: "#27ae60",
  },
  {
    key: "items",
    label: "Itens",
    singular: "Item / Artefato",
    icon: "sword-cross",
    description: "Armas, relíquias mágicas, poções e tecnologias",
    color: "#d35400",
  },
  {
    key: "locations",
    label: "Locais",
    singular: "Local",
    icon: "map-marker-radius",
    description: "Cidades, reinos, ruínas, templos e paisagens",
    color: "#2980b9",
  },
  {
    key: "organizations",
    label: "Organizações",
    singular: "Organização",
    icon: "shield-account",
    description: "Guildas, seitas, governos, ordens e facções",
    color: "#16a085",
  },
  {
    key: "world-rules",
    label: "Regras do Universo",
    singular: "Regra do Universo",
    icon: "book-open-page-variant",
    description: "Sistemas de magia, física, metafísica e leis da realidade",
    color: "#c0392b",
  },
  {
    key: "theme",
    label: "Tema",
    singular: "Tema / Conceito",
    icon: "palette-swatch",
    description: "Conceito central, estética, atmosfera e tons narrativos",
    color: "#704563",
  },
];

export const CHARACTER_ROLES: { role: CharacterRole; color: string; icon: string }[] = [
  { role: "Protagonista", color: "#2e7d32", icon: "star-circle" },
  { role: "Antagonista", color: "#c62828", icon: "skull" },
  { role: "Mentor", color: "#1565c0", icon: "school" },
  { role: "Aliado", color: "#e65100", icon: "handshake" },
  { role: "Secundário", color: "#616161", icon: "account-outline" },
];

export const TIMELINE_IMPORTANCE_COLORS: Record<TimelineImportance, string> = {
  Crucial: "#b71c1c",
  Maior: "#e65100",
  Menor: "#546e7a",
};
