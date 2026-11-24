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
    "../../auth/session": {
      useAuthStore: { getState: () => ({ sessionVersion: 1 }) },
    },
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

const conceptItem = {
  category: "theme",
  name: "Origem",
  description: "História",
  attributes: {
    "Tipo de Conceito": "Lore/História",
    Região: "Cosmos",
    Notas: "Nota",
  },
  image: "https://example.com/image.jpg",
  tags: [],
  subtitle: "",
};
test("conceitos usam documento compartilhado com revisão e preservam outras histórias", async () => {
  let doc = {
    revision: 9,
    value: [
      { id: "foreign", projectId: "other", title: "Outro", category: "Local" },
    ],
  };
  const calls = [];
  const { universeApi: api } = environment(async (req) => {
    calls.push(req);
    if (req.method === "PUT") {
      assert.equal(req.url, "/api/workspace/concepts");
      assert.equal(req.data.revision, doc.revision);
      doc = { revision: doc.revision + 1, value: req.data.value };
      return doc;
    }
    return structuredClone(doc);
  });
  await api.saveEncyclopedia("book", conceptItem);
  assert.equal(doc.value.length, 2);
  const added = doc.value[1];
  assert.equal(added.category, "Lore / História");
  assert.equal(added.imageUrl, conceptItem.image);
  assert.equal(added.projectId, "book");
  const original = { ...conceptItem, id: "concept:" + added.id };
  await api.saveEncyclopedia(
    "book",
    { ...conceptItem, name: "Revisado" },
    original,
  );
  assert.equal(doc.value[1].title, "Revisado");
  assert.equal(doc.value[0].title, "Outro");
  await api.deleteEncyclopedia("book", original);
  assert.equal(doc.value.length, 1);
  await assert.rejects(
    () =>
      api.saveEncyclopedia("book", conceptItem, {
        ...original,
        id: "concept:foreign",
      }),
    /não encontrado/,
  );
});
test("categorias relacionais enviam apenas campos reconhecidos e não repetem escritas com falha", async () => {
  const calls = [];
  const { universeApi: api } = environment(async (req) => {
    calls.push(req);
  });
  await api.saveEncyclopedia("book", {
    ...conceptItem,
    category: "creatures",
    attributes: { Aparência: "Alada", Comportamento: "Calmo", Habitat: "Céu" },
    raceId: "race",
  });
  assert.deepEqual(calls[0].data, {
    name: "Origem",
    description: "História",
    appearance: "Alada",
    behavior: "Calmo",
    habitat: "Céu",
    creatureImage: conceptItem.image,
    raceId: "race",
  });
  await api.deleteEncyclopedia("book", {
    ...conceptItem,
    category: "world-rules",
    id: "rule",
  });
  assert.equal(calls[1].url, "/api/stories/book/world-rules/rule");
  let attempts = 0;
  const failing = environment(async () => {
    attempts++;
    throw Error("offline");
  }).universeApi;
  await assert.rejects(
    () =>
      failing.saveEncyclopedia("book", {
        ...conceptItem,
        category: "world-rules",
      }),
    /offline/,
  );
  assert.equal(attempts, 1);
});
test("mapeamento mantém capítulos, notas de personagem e ordem da cronologia livre", () => {
  const { universeApi: api } = environment();
  const data = api.mapUniverse({
    chapters: [{ id: "ch", title: "Capítulo" }],
    characters: [{ id: "c", name: "Pessoa", notes: "Nota web" }],
    chronology: [
      {
        id: "e",
        title: "Origem",
        order: 0,
        location: "Vale",
        characters: "Ana, Bia",
        yearOrDate: "Antes",
      },
    ],
  });
  assert.equal(data.chapters[0].id, "ch");
  assert.equal(data.characters[0].notes, "Nota web");
  assert.equal(data.timelineEvents[0].dateOrder, 0);
  assert.equal(data.timelineEvents[0].location, "Vale");
  assert.deepEqual(data.timelineEvents[0].charactersInvolved, ["Ana", "Bia"]);
});
