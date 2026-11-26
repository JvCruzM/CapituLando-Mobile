import type { WorkspaceIdea } from "../workspace/services/workspace-api";
export const IDEA_CATEGORIES = [
  "Geral",
  "Nomes",
  "Mundo",
  "Personagens",
  "Regras",
] as const;
export type SuggestionKind = "names" | "personalities" | "worlds" | "rules";
export const SUGGESTION_KINDS: {
  kind: SuggestionKind;
  label: string;
  category: string;
}[] = [
  { kind: "names", label: "Nome", category: "Nomes" },
  { kind: "personalities", label: "Personalidade", category: "Personagens" },
  { kind: "worlds", label: "Mundo / Local", category: "Mundo" },
  { kind: "rules", label: "Regra", category: "Regras" },
];
const SUGGESTIONS_DATABASE: Record<
  string,
  {
    names: string[];
    personalities: string[];
    worlds: string[];
    rules: string[];
  }
> = {
  Fantasia: {
    names: [
      "Aurelius Vance",
      "Elowen Vale",
      "Kaelen Vane",
      "Thalia Solis",
      "Zephyr Nightshade",
      "Lysander Vane",
      "Isolde Brightwood",
      "Gideon Blackwood",
      "Rowan Sterling",
      "Valerie Frost",
      "Caspian Draven",
      "Lyra Moonwhisper",
      "Orion Ashworth",
      "Seraphina Cross",
      "Dorian Nightshade",
      "Aelin Fireheart",
      "Balthazar Thorne",
      "Evadne Starling",
      "Morrigan Crowe",
      "Sylvester Vance",
    ],
    personalities: [
      "Guardião estóico com medo secreto de falhar.",
      "Mago prodígio impulsivo que atua sem pensar.",
      "Antigo cavaleiro desonrado em busca de redenção.",
      "Erudita cética que acaba por descobrir magia ancestral.",
      "Ladrão carismático com um código moral estrito e inegociável.",
      "Sacerdotisa exilada atormentada por visões do futuro.",
      "Príncipe herdeiro rebelde disfarçado de mercenário.",
      "Alquimista excêntrico obcecado por criar a poção da imortalidade.",
      "Caçador de monstros solitário que protege criaturas mágicas.",
      "Nómada silencioso que guarda um segredo sobre o fim dos deuses.",
    ],
    worlds: [
      "Vales Sussurrantes: Floresta antiga onde as árvores guardam memórias dos mortos.",
      "Cidade de Quartzo: Fortaleza escavada numa montanha flutuante de cristais.",
      "Ilhas Nebulosas: Arquipélago onde o tempo flui a velocidades diferentes.",
      "Reino Subterrâneo de Oros: Cidades iluminadas por fungos bioluminescentes.",
      "Deserto de Cinzas: Terras áridas onde impérios antigos foram sepultados.",
      "Arquipélago dos Ventos: Ilhas ligadas apenas por pontes de corda e magia aérea.",
      "Pantanal de Lótus: Pântano místico cujas flores concedem visões proféticas.",
      "Cidadela de Aço: Metrópole industrial onde a tecnologia substituiu a magia.",
    ],
    rules: [
      "A magia exige um sacrifício físico ou emocional proporcional à sua intensidade.",
      "Espelhos purificados refletem e aprisionam seres espirituais e sombras.",
      "Nenhum mortal pode pronunciar o verdadeiro nome dos deuses sem enlouquecer.",
      "A luz do sol pleno anula temporariamente qualquer feitiço de ilusão.",
      "O sangue de dragão consumido concede poder mas corrompe a alma do utilizador.",
      "Objectos encantados perdem o seu poder se forem tocados por ferro frio.",
      "Toda a promessa feita sob a lua nova torna-se um contrato mágico vinculativo.",
      "A morte de um monarca liberta um cataclismo elemental na região.",
    ],
  },
  Mistério: {
    names: [
      "Inspector Arthur Pendelton",
      "Clara Sterling",
      "Devon Hayes",
      "Sloane Vance",
      "Julian Vance",
      "Victoria Cross",
      "Marcus Sterling",
      "Beatrice Thorne",
      "Nathaniel Drake",
      "Evelyn Reed",
      "Oliver Sterling",
      "Genevieve DuPont",
    ],
    personalities: [
      "Detetive metódico obcecado por pequenos detalhes e padrões.",
      "Jornalista destemida em busca da verdade por trás da corporação.",
      "Antigo médico forense com métodos pouco ortodoxos e cínicos.",
      "Psicólogo criminal brilhante que compreende a mente dos assassinos.",
      "Investigador particular cínico viciado em café e segredos alheios.",
      "Arquivista silencioso que descobre pistas esquecidas em documentos antigos.",
    ],
    worlds: [
      "Vila de Algures: Cidade costeira isolada envolta em nevoeiro perpétuo.",
      "Hotel Beira-Mar: Antigo edifício vitoriano abandonado após um homicídio irresoluto.",
      "Distrito Financeiro de Metro-City: Arranha-céus corporativos repletos de corrupção.",
      "Mansão Blackwood: Propriedade isolada com passagens secretas e cofres ocultos.",
      "Bairro Antigo: Ruas de paralelepípedos onde os segredos dos anos 70 ainda vivem.",
    ],
    rules: [
      "O culpado deixa sempre um objeto pessoal ou assinatura no local do crime.",
      "Ninguém fala sobre a fatídica noite de 1998 na cidade.",
      "Todas as provas recolhidas sem mandado judicial perdem validade legal.",
      "Testemunhas oculares sob ameaça mudam sempre o seu testemunho após 48 horas.",
      "O sistema de câmaras de segurança da cidade desliga-se exatamente à meia-noite.",
    ],
  },
  Geral: {
    names: [
      "Gabriel Santos",
      "Elena Rostova",
      "Lucas Vane",
      "Mateus Silva",
      "Beatriz Costa",
      "Rafael Mendes",
      "Sofia Alencar",
      "Diego Ramos",
      "Carolina Lima",
      "Thiago Farias",
    ],
    personalities: [
      "Idealista inabalável que tenta salvar todos ao seu redor.",
      "Estrategista frio e calculista focado estritamente no bem maior.",
      "Artista boémio que documenta a história através de pinturas e diários.",
      "Líder nato relutante que carrega o peso das escolhas do grupo.",
    ],
    worlds: [
      "A Capital do Vale: Centro de comércio murado entre colinas verdes.",
      "Distrito Esquecido: Zona industrial abandonada dominada por fações rivais.",
      "Estação Fronteiriça: Ponto de encontro entre diferentes culturas e reinos.",
    ],
    rules: [
      "Toda a aliança política exige um contrato assinado em presença de testemunhas.",
      "Segredos públicos perdem o seu valor estratégico após 7 dias de divulgação.",
      "Nenhum cidadão pode circular após o toque de recolher sem salvo-conduto.",
    ],
  },
};

const normalized = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
export function suggestionGenre(genre?: string | null) {
  return (
    Object.keys(SUGGESTIONS_DATABASE).find(
      (key) => normalized(key) === normalized(genre ?? ""),
    ) ?? "Geral"
  );
}
export function createSuggestion(
  kind: SuggestionKind,
  genre?: string | null,
  previous?: string,
) {
  const resolvedGenre = suggestionGenre(genre);
  const list = SUGGESTIONS_DATABASE[resolvedGenre]![kind];
  const choices =
    list.length > 1 ? list.filter((text) => text !== previous) : list;
  const type = SUGGESTION_KINDS.find((item) => item.kind === kind)!;
  return {
    text: choices[Math.floor(Math.random() * choices.length)] ?? list[0]!,
    label: "Sugestão de " + type.label,
    category: type.category,
    genre: resolvedGenre,
  };
}
export function filterIdeas(
  ideas: WorkspaceIdea[],
  projectId: string,
  category: string,
) {
  return ideas.filter(
    (idea) =>
      (!projectId || idea.projectId === projectId) &&
      (!category || (idea.category?.trim() || "Geral") === category),
  );
}
