const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", code)(
    (name) => (Object.hasOwn(mocks, name) ? mocks[name] : require(name)),
    module,
    module.exports,
  );
  return module.exports;
}

function environment(request = async () => ({})) {
  const universeApi = load("src/features/universe/services/universe-api.ts", {
    "../../../shared/api/account": { accountRequest: request },
  });
  return { universeApi };
}

test("mapUniverse mapeia imagens das entradas da enciclopédia", () => {
  const { universeApi } = environment();
  const snapshot = {
    races: [
      {
        id: "race-1",
        name: "Sylfos",
        description: "Povo alado",
        race_image: "data:image/jpeg;base64,sylfoImg",
      },
    ],
    creatures: [
      {
        id: "creature-1",
        name: "Leviatã",
        description: "Fera celeste",
        creature_image: "https://example.com/leviathan.png",
      },
    ],
    items: [
      {
        id: "item-1",
        name: "Astrolábio",
        description: "Artefato antigo",
        item_image: "data:image/png;base64,itemImg",
      },
    ],
    locations: [
      {
        id: "loc-1",
        name: "Cidadela Suspensa",
        description: "Cidade flutuante",
        location_image: "https://example.com/citadel.png",
      },
    ],
    organizations: [
      {
        id: "org-1",
        name: "Ordem dos Magos",
        description: "Guilda arcana",
        organization_image: "https://example.com/mages.png",
      },
    ],
  };

  const data = universeApi.mapUniverse(snapshot);
  const race = data.encyclopediaItems.find((i) => i.id === "race-1");
  const creature = data.encyclopediaItems.find((i) => i.id === "creature-1");
  const item = data.encyclopediaItems.find((i) => i.id === "item-1");
  const loc = data.encyclopediaItems.find((i) => i.id === "loc-1");
  const org = data.encyclopediaItems.find((i) => i.id === "org-1");

  assert.equal(race?.image, "data:image/jpeg;base64,sylfoImg");
  assert.equal(creature?.image, "https://example.com/leviathan.png");
  assert.equal(item?.image, "data:image/png;base64,itemImg");
  assert.equal(loc?.image, "https://example.com/citadel.png");
  assert.equal(org?.image, "https://example.com/mages.png");
});

test("mapUniverse mapeia vínculos: raça da criatura, local pai e sede da organização", () => {
  const { universeApi } = environment();
  const snapshot = {
    races: [{ id: "race-elf", name: "Elfos da Floresta" }],
    locations: [
      { id: "loc-realm", name: "Reino de Eldoria" },
      {
        id: "loc-capital",
        name: "Capital Dourada",
        parent_location_id: "loc-realm",
      },
      { id: "loc-castle", name: "Castelo Central" },
    ],
    creatures: [
      {
        id: "creat-1",
        name: "Grifo Florestal",
        race_id: "race-elf",
      },
    ],
    organizations: [
      {
        id: "org-knights",
        name: "Cavaleiros da Capital",
        headquarters_location_id: "loc-capital",
      },
    ],
  };

  const data = universeApi.mapUniverse(snapshot);
  const creature = data.encyclopediaItems.find((i) => i.id === "creat-1");
  const capital = data.encyclopediaItems.find((i) => i.id === "loc-capital");
  const knights = data.encyclopediaItems.find((i) => i.id === "org-knights");

  assert.equal(creature?.raceId, "race-elf");
  assert.equal(creature?.raceName, "Elfos da Floresta");

  assert.equal(capital?.parentLocationId, "loc-realm");
  assert.equal(capital?.parentLocationName, "Reino de Eldoria");

  assert.equal(knights?.headquartersLocationId, "loc-capital");
  assert.equal(knights?.headquartersLocationName, "Capital Dourada");
});

test("mapUniverse mapeia conceitos vindos do web com edição completa e suporte a Lore/História", () => {
  const { universeApi } = environment();
  const snapshot = {
    concepts: [
      {
        id: "concept-lore-1",
        name: "A Guerra dos Éteres",
        description: "Conflito milenar que dividiu os continentes.",
        category: "Lore/História",
        region: "Terras Altas",
        notes: "Mencionada no tomo antigo.",
      },
      {
        id: "concept-magic-1",
        name: "Magia Rúnica",
        description: "Regras sobre runas arcanas.",
        category: "Regra de Magia",
        notes: "Exige canalizadores de prata.",
      },
    ],
  };

  const data = universeApi.mapUniverse(snapshot);
  const loreConcept = data.encyclopediaItems.find(
    (i) => i.id === "concept:concept-lore-1",
  );
  const magicConcept = data.encyclopediaItems.find(
    (i) => i.id === "concept:concept-magic-1",
  );

  assert.ok(loreConcept);
  assert.equal(loreConcept.name, "A Guerra dos Éteres");
  assert.equal(loreConcept.category, "theme");
  assert.equal(loreConcept.conceptCategory, "Lore/História");
  assert.equal(loreConcept.attributes["Região"], "Terras Altas");
  assert.equal(loreConcept.attributes["Notas"], "Mencionada no tomo antigo.");
  assert.equal(loreConcept.editable, true);
  assert.equal(universeApi.canEditEntry(loreConcept), true);

  assert.ok(magicConcept);
  assert.equal(magicConcept.name, "Magia Rúnica");
  assert.equal(magicConcept.category, "world-rules");
  assert.equal(magicConcept.conceptCategory, "Regra de Magia");
  assert.equal(magicConcept.editable, true);
});

test("saveEncyclopedia salva conceitos e lore/história via endpoint /api/stories/:storyId/concepts", async () => {
  const calls = [];
  const { universeApi } = environment(async (config) => {
    calls.push(config);
    return { success: true };
  });

  // Criação de novo conceito de Lore
  await universeApi.saveEncyclopedia("story-123", {
    category: "theme",
    name: "A Origem do Mundo",
    subtitle: "Lenda inaugural",
    description: "No princípio havia apenas o Éter primordial.",
    attributes: {
      "Tipo de Conceito": "Lore/História",
      Região: "Cosmos",
      Notas: "Capítulo introdutório",
    },
    tags: ["Origem", "Primordial"],
    image: "https://example.com/cosmos.jpg",
    conceptCategory: "Lore/História",
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/stories/story-123/concepts");
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].data.name, "A Origem do Mundo");
  assert.equal(calls[0].data.category, "Lore/História");
  assert.equal(calls[0].data.region, "Cosmos");
  assert.equal(calls[0].data.notes, "Capítulo introdutório");
  assert.equal(calls[0].data.image, "https://example.com/cosmos.jpg");

  // Edição de conceito existente
  await universeApi.saveEncyclopedia(
    "story-123",
    {
      category: "theme",
      name: "A Origem do Mundo (Revisada)",
      subtitle: "",
      description: "Descrição expandida.",
      attributes: {
        "Tipo de Conceito": "Lore/História",
      },
      tags: [],
    },
    {
      id: "concept:456",
      category: "theme",
      name: "A Origem do Mundo",
      subtitle: "",
      description: "",
      attributes: {},
      tags: [],
      createdAt: "",
      updatedAt: "",
    },
  );

  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, "/api/stories/story-123/concepts/456");
  assert.equal(calls[1].method, "PUT");
  assert.equal(calls[1].data.name, "A Origem do Mundo (Revisada)");
});

test("deleteEncyclopedia exclui conceitos e entradas com endpoints corretos", async () => {
  const calls = [];
  const { universeApi } = environment(async (config) => {
    calls.push(config);
    return { success: true };
  });

  // Exclusão de conceito
  await universeApi.deleteEncyclopedia("story-123", {
    id: "concept:789",
    category: "theme",
    name: "Conceito Descartado",
    subtitle: "",
    description: "",
    attributes: {},
    tags: [],
    createdAt: "",
    updatedAt: "",
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/stories/story-123/concepts/789");
  assert.equal(calls[0].method, "DELETE");

  // Exclusão de criatura padrão
  await universeApi.deleteEncyclopedia("story-123", {
    id: "creat-99",
    category: "creatures",
    name: "Besta",
    subtitle: "",
    description: "",
    attributes: {},
    tags: [],
    createdAt: "",
    updatedAt: "",
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, "/api/stories/story-123/creatures/creat-99");
  assert.equal(calls[1].method, "DELETE");
});
