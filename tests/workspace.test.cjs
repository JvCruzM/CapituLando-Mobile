const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript");
function load(file, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  new Function("require", "module", "exports", code)(
    (name) =>
      name.endsWith("/shared/components/Controls") &&
      mocks["react-native-paper"]
        ? mocks["react-native-paper"]
        : Object.hasOwn(mocks, name)
          ? mocks[name]
          : require(name),
    module,
    module.exports,
  );
  return module.exports;
}
const ideas = load("src/features/ideas/idea-tools.ts"),
  goals = load("src/features/goals/goal-tools.ts");
const stories = [
  {
    id: "a",
    title: "Livro A",
    genre: "Fantasia",
    status: "DRAFT",
    progressPercentage: 20,
    chapterCount: 2,
    wordCount: 40,
  },
  {
    id: "b",
    title: "Livro B",
    genre: "Mistério",
    status: "IN_PROGRESS",
    progressPercentage: 60,
    chapterCount: 3,
    wordCount: 90,
  },
];
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children), ...nodes(tree.props?.anchor)];
}
function text(tree) {
  if (typeof tree === "string" || typeof tree === "number") return String(tree);
  if (Array.isArray(tree)) return tree.map(text).join("");
  return tree?.props ? text(tree.props.children) : "";
}
function paper() {
  const result = Object.fromEntries(
    [
      "Button",
      "Chip",
      "HelperText",
      "Portal",
      "Text",
      "TextInput",
      "ProgressBar",
    ].map((n) => [n, n]),
  );
  for (const name of ["Card", "Dialog"])
    result[name] = Object.assign(() => null, {
      Content: name + "Content",
      Actions: name + "Actions",
      Title: name + "Title",
    });
  result.Menu = Object.assign(() => null, { Item: "MenuItem" });
  return result;
}
const tick = () => new Promise(setImmediate);
function collection(section, initial = [], preferences = { goalAlerts: true }) {
  const slots = [];
  let cursor = 0,
    items = initial,
    revision = 0,
    settings = preferences === null ? undefined : { value: preferences },
    fail = false,
    pause = null,
    calls = 0;
  const hooks = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots))
        slots[i] = typeof initial === "function" ? initial() : initial;
      return [
        slots[i],
        (next) =>
          (slots[i] = typeof next === "function" ? next(slots[i]) : next),
      ];
    },
    useRef(initial) {
      const i = cursor++;
      return (slots[i] ??= { current: initial });
    },
  };
  const ui = paper();
  const data = {
    get data() {
      return { value: items, revision };
    },
    get items() {
      return items;
    },
    busy: false,
    isFetching: false,
    fetchStatus: "idle",
    refetch: async () => {},
    async update(updater) {
      calls++;
      if (pause) await pause;
      if (fail) throw new Error("Falha ao salvar");
      items = updater(items);
      revision++;
      return { value: items, revision };
    },
  };
  const { CollectionScreen } = load(
    "src/features/workspace/screens/CollectionScreen.tsx",
    {
      react: hooks,
      "react-native": { View: "View" },
      "react-native-paper": ui,
      "@tanstack/react-query": {
        useQuery: () => ({
          data: settings,
          fetchStatus: "idle",
          refetch: async () => {},
        }),
      },
      "../../../shared/components/Screen": { Screen: "Screen" },
      "../../../shared/components/AccountQueryStatus": {
        AccountQueryStatus: "Status",
      },
      "../../../shared/api/account": { accountErrorMessage: (e) => e.message },
      "../../auth/session": {
        useAuthStore: (selector) =>
          selector({ session: { user: { id: "owner" } } }),
      },
      "../../stories/services/stories-api": {
        useStories: () => ({
          data: stories,
          fetchStatus: "idle",
          refetch: async () => {},
        }),
      },
      "../../settings/services/settings-api": {
        settingsKey: (id) => ["settings", id],
        loadSettings: async () => settings,
      },
      "../../ideas/idea-tools": ideas,
      "../../goals/goal-tools": goals,
      "../services/workspace-api": { useWorkspaceSection: () => data },
    },
  );
  let tree;
  const env = {
    render() {
      cursor = 0;
      return (tree = CollectionScreen({ section }));
    },
    get items() {
      return items;
    },
    get tree() {
      return tree;
    },
    get calls() {
      return calls;
    },
    set fail(value) {
      fail = value;
    },
    set pause(value) {
      pause = value;
    },
    set preferences(value) {
      settings = value === null ? undefined : { value };
    },
    field(label, value) {
      const field = nodes(tree).find((n) => n.props?.label === label);
      assert(field, "campo " + label);
      field.props.onChangeText(value);
      env.render();
    },
    press(label, scope = tree) {
      const button = nodes(scope).find(
        (n) =>
          n.props?.onPress &&
          (text(n) === label || n.props.accessibilityLabel === label),
      );
      assert(button, "controle " + label);
      assert(!button.props.disabled, "controle desabilitado " + label);
      button.props.onPress();
      env.render();
    },
    card(id) {
      return nodes(tree).find((n) => n.type === ui.Card && n.key === id);
    },
    async flush() {
      await tick();
      env.render();
    },
  };
  env.render();
  return env;
}
test("ideias mantêm categoria e livro ao criar e editar, e filtros não apagam outros registros", async () => {
  const env = collection("ideas", [
    {
      id: "old",
      projectId: "a",
      content: "Ideia antiga",
      category: "Nomes",
      createdAt: "2026-01-01",
    },
  ]);
  env.press("Vincular a Livro B");
  env.field("Ideia", "Novo mundo");
  env.press("Categoria Mundo");
  env.press("Adicionar ideia");
  await env.flush();
  const created = env.items.find((i) => i.id !== "old");
  assert.equal(created.category, "Mundo");
  assert.equal(created.projectId, "b");
  assert(Number.isFinite(Date.parse(created.createdAt)));
  assert(!env.card("old"));
  assert(env.card(created.id));
  env.press("Filtrar categoria Nomes");
  assert(!env.card(created.id));
  env.press("Todas as categorias");
  env.press("Todos os livros");
  assert(env.card("old"));
  assert.equal(env.items.length, 2);
  env.press("Editar", env.card(created.id));
  env.field("Ideia", "Mundo revisado");
  env.press("Salvar alterações");
  await env.flush();
  const updated = env.items.find((i) => i.id === created.id);
  assert.equal(updated.content, "Mundo revisado");
  assert.equal(updated.category, "Mundo");
  assert.equal(updated.createdAt, created.createdAt);
  assert.equal(env.items.find((i) => i.id === "old").content, "Ideia antiga");
});
test("sugestão respeita o gênero e é descartada ao trocar de livro; duplo toque salva apenas uma ideia", async () => {
  const env = collection("ideas");
  env.press("Sugerir mundo / local");
  assert(text(env.tree).includes("Sugestão de Mundo / Local"));
  env.press("Vincular a Livro B");
  assert(
    !nodes(env.tree).some((n) => text(n) === "Salvar sugestão como ideia"),
  );
  env.press("Sugerir nome");
  let release;
  env.pause = new Promise((resolve) => (release = resolve));
  env.press("Salvar sugestão como ideia");
  env.press("Salvar sugestão como ideia");
  assert.equal(env.calls, 1);
  release();
  await env.flush();
  assert.equal(env.items.length, 1);
  assert.equal(env.items[0].projectId, "b");
  assert.equal(env.items[0].category, "Nomes");
  assert(env.items[0].content.startsWith("Sugestão de Nome: "));
  assert(!text(env.tree).includes("Salvar sugestão como ideia"));
});
test("gerador reconhece gêneros sem distinguir acentos e usa a coleção geral como alternativa", () => {
  assert.equal(ideas.suggestionGenre(" mistério "), "Mistério");
  assert.equal(ideas.suggestionGenre("MISTERIO"), "Mistério");
  assert.equal(ideas.suggestionGenre("fantasia"), "Fantasia");
  assert.equal(ideas.suggestionGenre("Romance"), "Geral");
  for (const { kind, category } of ideas.SUGGESTION_KINDS) {
    const first = ideas.createSuggestion(kind, "Fantasia");
    const second = ideas.createSuggestion(kind, "Fantasia", first.text);
    assert(first.text);
    assert.notEqual(second.text, first.text);
    assert.equal(second.category, category);
  }
});
const goal = {
  id: "g",
  title: "Escrever",
  unit: "palavras",
  current: 500,
  target: 500,
  completed: true,
};

test("seletor de unidade salva a escolha e preserva unidades antigas ao editar", async () => {
  const env = collection("goals", [{ ...goal, unit: "parágrafos" }]);
  env.press("Editar", env.card("g"));
  env.press("Selecionar unidade da meta");
  env.press("Usar unidade parágrafos");
  env.field("Título da meta", "Revisar parágrafos");
  env.press("Salvar alterações");
  await env.flush();
  assert.equal(env.items[0].unit, "parágrafos");
  env.press("Editar", env.card("g"));
  env.press("Selecionar unidade da meta");
  for (const unit of goals.GOAL_UNITS)
    assert(
      nodes(env.tree).some(
        (n) => n.props?.accessibilityLabel === "Usar unidade " + unit,
      ),
    );
  env.press("Usar unidade capítulos");
  env.press("Salvar alterações");
  await env.flush();
  assert.equal(env.items[0].unit, "capítulos");
  assert.equal(env.items[0].current, 500);
  assert.equal(env.items[0].target, 500);
});
test("reabrir preserva progresso como no web e concluir exibe aviso somente quando habilitado", async () => {
  const env = collection("goals", [goal]);
  env.press("Reabrir", env.card("g"));
  await env.flush();
  assert.equal(env.items[0].current, 499);
  assert.equal(env.items[0].completed, false);
  assert(!text(env.tree).includes("Parabéns!"));
  env.press("Concluir", env.card("g"));
  await env.flush();
  assert.equal(env.items[0].current, 500);
  assert.equal(env.items[0].completed, true);
  assert(text(env.tree).includes("Parabéns! Meta concluída."));
  env.preferences = { goalAlerts: false };
  env.render();
  assert(!text(env.tree).includes("Parabéns!"));
  env.press("Reabrir", env.card("g"));
  await env.flush();
  env.press("Concluir", env.card("g"));
  await env.flush();
  assert(!text(env.tree).includes("Parabéns!"));
  assert.equal(goals.toggleGoal({ ...goal, current: 1, target: 1 }).current, 0);
});
test("concluir por edição respeita a configuração e não repete aviso para uma meta já concluída", async () => {
  const env = collection(
    "goals",
    [{ ...goal, current: 3, target: 5, completed: false }],
    { goalAlerts: false },
  );
  env.press("Editar", env.card("g"));
  env.field("Progresso atual", "5");
  env.press("Salvar alterações");
  await env.flush();
  assert.equal(env.items[0].completed, true);
  assert(!text(env.tree).includes("Parabéns!"));
  env.preferences = { goalAlerts: true };
  env.render();
  env.press("Editar", env.card("g"));
  env.field("Título da meta", "Título atualizado");
  env.press("Salvar alterações");
  await env.flush();
  assert(!text(env.tree).includes("Parabéns!"));
  assert.equal(env.items[0].title, "Título atualizado");
});
test("falha ao salvar não conclui meta nem mostra aviso de sucesso; configurações devem carregar antes da edição", async () => {
  const env = collection("goals", [
    { ...goal, current: 3, target: 5, completed: false },
  ]);
  env.fail = true;
  env.press("Editar", env.card("g"));
  env.field("Progresso atual", "5");
  env.press("Salvar alterações");
  await env.flush();
  assert.equal(env.items[0].current, 3);
  assert(text(env.tree).includes("Falha ao salvar"));
  assert(!text(env.tree).includes("Parabéns!"));
  assert(
    nodes(env.tree).some(
      (n) => n.props?.label === "Progresso atual" && n.props.value === "5",
    ),
  );
  const waiting = collection("goals", [], null);
  assert.equal(waiting.tree.type, "Status");
});
test("painel utiliza o resumo da API, mostra cinco livros e abre o livro correto", () => {
  const all = Array.from({ length: 6 }, (_, i) => ({
      ...stories[0],
      id: String(i),
      title: "Livro " + i,
    })),
    navigation = [];
  let refreshed = 0;
  const ui = paper();
  const { default: Home } = load("src/features/home/screens/HomeScreen.tsx", {
    "react-native": { View: "View" },
    "react-native-paper": ui,
    "expo-router": { router: { push: (target) => navigation.push(target) } },
    "../../../shared/components/Screen": { Screen: "Screen" },
    "../../../shared/components/AccountQueryStatus": {
      AccountQueryStatus: "Status",
    },
    "../../../shared/api/account": { accountErrorMessage: (e) => e.message },
    "../../stories/services/stories-api": {
      useStories: () => ({
        data: all,
        refetch: () => refreshed++,
        isFetching: false,
      }),
    },
    "../services/dashboard-api": {
      useDashboard: () => ({
        data: {
          storyCount: 6,
          chapterCount: 15,
          wordCount: 1234,
          ideaCount: 8,
          goals: { total: 4, completed: 3, percentage: 75 },
        },
        refetch: () => refreshed++,
        isFetching: false,
      }),
    },
  });
  const tree = Home();
  assert(text(tree).includes("1234 palavras"));
  assert(text(tree).includes("75% das metas"));
  assert.equal(
    nodes(tree).filter(
      (n) => n.type === ui.Card && n.key !== null && /^\d+$/.test(n.key),
    ).length,
    5,
  );
  assert(!text(tree).includes("Livro 5"));
  nodes(tree)
    .find((n) => n.props?.accessibilityLabel === "Ver capítulos de Livro 2")
    .props.onPress();
  assert.deepEqual(navigation[0], {
    pathname: "/capitulos/[id]",
    params: { id: "2", title: "Livro 2" },
  });
  nodes(tree)
    .find((n) => n.props?.onPress && text(n) === "Atualizar painel")
    .props.onPress();
  assert.equal(refreshed, 2);
});

test("criar uma meta já concluída respeita o padrão dos avisos e rejeita valores inválidos sem salvar", async () => {
  const env = collection("goals", [], {});
  env.field("Título da meta", "Cinco páginas");
  env.field("Progresso atual", "-1");
  env.field("Objetivo", "5");
  env.press("Adicionar meta");
  await env.flush();
  assert.equal(env.calls, 0);
  assert(text(env.tree).includes("progresso não negativo"));
  env.field("Progresso atual", "5");
  env.press("Adicionar meta");
  await env.flush();
  assert.equal(env.items.length, 1);
  assert(env.items[0].completed);
  assert(text(env.tree).includes("Parabéns! Meta concluída."));
});
test("salvar ideias invalida o painel da mesma conta; resposta de outra conta não atualiza o cache", async () => {
  const requests = [],
    cache = [],
    invalidations = [];
  let currentOwner = "owner";
  let mutation;
  const doc = {
    revision: 3,
    value: [{ id: "a", projectId: "book", content: "Antiga" }],
  };
  const useAuthStore = (selector) =>
    selector({ session: { user: { id: currentOwner } } });
  useAuthStore.getState = () => ({ session: { user: { id: currentOwner } } });
  const api = load("src/features/workspace/services/workspace-api.ts", {
    "@tanstack/react-query": {
      useQuery: () => ({ data: doc }),
      useQueryClient: () => ({
        setQueryData: (key, value) => cache.push({ key, value }),
        invalidateQueries: async (input) => invalidations.push(input),
      }),
      useMutation: (config) => {
        mutation = config;
        return {
          mutateAsync: async (updater) => {
            const saved = await config.mutationFn(updater);
            await config.onSuccess(saved);
            return saved;
          },
        };
      },
    },
    "../../../shared/api/account": {
      accountRequest: async (config) => {
        requests.push(config);
        return { revision: 4, value: config.data.value };
      },
    },
    "../../auth/session": { useAuthStore },
    "../../home/services/dashboard-api": {
      dashboardKey: (id) => ["dashboard", id],
    },
  });
  const hook = api.useWorkspaceSection("ideas");
  await hook.update((items) => [
    ...items,
    { id: "b", projectId: "book", content: "Nova", category: "Mundo" },
  ]);
  assert.equal(requests[0].url, "/api/workspace/ideas");
  assert.equal(requests[0].data.revision, 3);
  assert.deepEqual(invalidations, [{ queryKey: ["dashboard", "owner"] }]);
  assert.deepEqual(cache[0].key, ["workspace", "owner", "ideas"]);
  currentOwner = "other";
  await mutation.onSuccess({ revision: 5, value: [] });
  assert.equal(cache.length, 1);
  assert.equal(invalidations.length, 1);
});
