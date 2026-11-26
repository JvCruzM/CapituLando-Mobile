const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript");
function load(path, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
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
test("site do autor permite somente HTTP/HTTPS e abre com a API nativa", async () => {
  const calls = [];
  const api = load("src/features/profile/services/profile-website.ts", {
    "react-native": {
      Platform: { OS: "android" },
      Linking: { openURL: async (url) => calls.push(url) },
    },
  });
  assert.equal(
    api.authorWebsite(" https://autor.example.test/livros "),
    "https://autor.example.test/livros",
  );
  for (const value of [
    "javascript:alert(1)",
    "file:///private",
    "data:text/html,test",
    "capitulando://entrar",
    "https://name:password@autor.example.test",
    "sem-protocolo",
  ])
    assert.equal(api.authorWebsite(value), null);
  await api.openAuthorWebsite("https://autor.example.test/livros");
  assert.deepEqual(calls, ["https://autor.example.test/livros"]);
  await assert.rejects(
    () => api.openAuthorWebsite("javascript:alert(1)"),
    /endereço válido/,
  );
  assert.equal(calls.length, 1);
  const unavailable = load("src/features/profile/services/profile-website.ts", {
    "react-native": {
      Platform: { OS: "ios" },
      Linking: {
        openURL: async () => {
          throw new Error("not supported");
        },
      },
    },
  });
  await assert.rejects(
    () => unavailable.openAuthorWebsite("https://autor.example.test"),
    /Não foi possível abrir o site/,
  );
});
test("perfil abre em consulta, cancela alterações e volta à consulta com os dados salvos", async () => {
  let profile = {
    id: "owner",
    email: "autor@example.test",
    username: "autor",
    displayName: "Autora",
    bio: "Biografia salva",
    avatarImage: null,
    penName: "Pseudônimo",
    quote: "Minha frase",
    websiteUrl: "https://autor.example.test",
    favoriteGenres: ["Fantasia"],
  };
  const states = new Map();
  let current,
    cursor = 0,
    saved = [],
    opened = [];
  const auth = { session: { user: { id: "owner", displayName: "Autora" } } };
  const useAuthStore = (selector) => selector(auth);
  useAuthStore.setState = (updater) => Object.assign(auth, updater(auth));
  const { ProfileScreen } = load(
    "src/features/profile/screens/ProfileScreen.tsx",
    {
      react: {
        useState(initial) {
          const values = states.get(current) ?? [];
          states.set(current, values);
          const i = cursor++;
          if (!(i in values)) values[i] = initial;
          return [
            values[i],
            (next) =>
              (values[i] = typeof next === "function" ? next(values[i]) : next),
          ];
        },
      },
      "react-native": { View: "View" },
      "react-native-paper": Object.fromEntries(
        ["Button", "Chip", "HelperText", "Text", "TextInput"].map((n) => [
          n,
          n,
        ]),
      ),
      "@tanstack/react-query": {
        useQuery: () => ({ data: profile }),
        useQueryClient: () => ({
          setQueryData: (key, value) => {
            profile = value;
          },
        }),
        useMutation: (config) => ({
          isPending: false,
          isSuccess: false,
          mutate: async (data) => {
            const updated = await config.mutationFn(data);
            config.onSuccess(updated);
          },
        }),
      },
      "../../../shared/components/Screen": { Screen: "Screen" },
      "../../../shared/components/ProfileAvatar": { ProfileAvatar: "Avatar" },
      "../services/profile-photo": { chooseProfilePhoto: async () => null },
      "../../../shared/components/AccountQueryStatus": {
        AccountQueryStatus: "Status",
      },
      "../../../shared/api/account": {
        accountErrorMessage: (error) => error.message,
      },
      "../../auth/session": { useAuthStore },
      "../services/profile-api": {
        loadProfile: async () => profile,
        saveProfile: async (data) => {
          saved.push(data);
          return { ...profile, ...data };
        },
      },
      "../services/profile-website": {
        authorWebsite: (value) => value || null,
        openAuthorWebsite: async (url) => opened.push(url),
      },
    },
  );
  function renderComponent(component, props = {}) {
    current = component;
    cursor = 0;
    return component(props);
  }
  let previous;
  function render() {
    const element = renderComponent(ProfileScreen);
    if (previous && previous !== element.type) states.delete(previous);
    previous = element.type;
    return renderComponent(element.type, element.props);
  }
  function nodes(tree) {
    if (!tree || typeof tree !== "object") return [];
    if (Array.isArray(tree)) return tree.flatMap(nodes);
    return [tree, ...nodes(tree.props?.children)];
  }
  function text(tree) {
    if (typeof tree === "string") return tree;
    if (Array.isArray(tree)) return tree.map(text).join("");
    return tree?.props ? text(tree.props.children) : "";
  }
  function button(tree, label) {
    return nodes(tree).find((n) => n.props?.onPress && text(n) === label);
  }
  let tree = render();
  assert(text(tree).includes("Biografia salva"));
  assert(text(tree).includes("Pseudônimo"));
  assert(!nodes(tree).some((n) => n.type === "TextInput"));
  await button(tree, "Visitar site do autor").props.onPress();
  assert.deepEqual(opened, ["https://autor.example.test"]);
  button(tree, "Editar perfil").props.onPress();
  tree = render();
  nodes(tree)
    .find((n) => n.props?.label === "Biografia")
    .props.onChangeText("Não salvar");
  button(tree, "Cancelar edição").props.onPress();
  tree = render();
  assert(text(tree).includes("Biografia salva"));
  assert.equal(saved.length, 0);
  button(tree, "Editar perfil").props.onPress();
  tree = render();
  nodes(tree)
    .find((n) => n.props?.label === "Biografia")
    .props.onChangeText("Nova biografia");
  tree = render();
  button(tree, "Salvar perfil").props.onPress();
  await new Promise(setImmediate);
  tree = render();
  assert(text(tree).includes("Nova biografia"));
  assert(!nodes(tree).some((n) => n.type === "TextInput"));
  assert.equal(saved.length, 1);
});
