const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
function load(file, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
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
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
test("login e logout alternam os grupos protegidos, mantendo as telas de token públicas e as animações acessíveis", () => {
  let session = null,
    animation = "slide_from_right";
  const Stack = Object.assign(() => null, {
    Screen: "Screen",
    Protected: "Protected",
  });
  const theme = { colors: {}, fonts: {} };
  const Root = load("src/app/_layout.tsx", {
    react: { useEffect() {}, useMemo: (fn) => fn() },
    "react-native": {
      AppState: {},
      View: "View",
      useColorScheme: () => "light",
    },
    "@expo/vector-icons/MaterialCommunityIcons": () => null,
    "expo-router": {
      Stack,
      ThemeProvider: "ThemeProvider",
      DefaultTheme: { colors: {} },
      DarkTheme: { colors: {} },
    },
    "expo-status-bar": { StatusBar: "StatusBar" },
    "react-native-paper": {
      PaperProvider: "PaperProvider",
      ActivityIndicator: "ActivityIndicator",
    },
    "react-native-safe-area-context": { SafeAreaProvider: "SafeAreaProvider" },
    "@tanstack/react-query": {
      QueryClientProvider: "QueryClientProvider",
      focusManager: {},
    },
    "../shared/api/query-client": { queryClient: {} },
    "../shared/theme/useAppBackground": { useAppBackground() {} },
    "../shared/theme/theme": { lightTheme: theme, darkTheme: theme },
    "../shared/store/ui-store": {
      useUIStore: (selector) =>
        selector({ themeMode: "light", fontSize: "md" }),
    },
    "../features/auth/session": {
      useAuthStore: (selector) => selector({ session, isInitialized: true }),
    },
    "../features/settings/hooks/useAccountPreferences": {
      useAccountPreferences() {},
    },
    "../features/auth/hooks/useSessionLifecycle": { useSessionLifecycle() {} },
    "../shared/navigation/useStackOptions": {
      useStackOptions: () => ({ animation }),
    },
  }).default;
  function render() {
    const wrapper = Root();
    return nodes(wrapper.props.children.type());
  }
  function available(tree) {
    return tree
      .flatMap((node) =>
        node.type === Stack
          ? node.props.children.flatMap((child) =>
              child.type === "Protected"
                ? child.props.guard
                  ? child.props.children
                  : []
                : [child],
            )
          : [],
      )
      .map((node) => node.props.name);
  }
  let tree = render();
  assert(available(tree).includes("entrar"));
  assert(!available(tree).includes("(tabs)"));
  session = { expiresAt: Date.now() + 60000 };
  tree = render();
  assert(available(tree).includes("(tabs)"));
  assert(
    available(tree).includes("index"),
    "a rota inicial deve existir também com sessão restaurada",
  );
  assert(!available(tree).includes("entrar"));
  for (const name of ["confirmar-email", "redefinir-senha", "sobre"])
    assert(available(tree).includes(name));
  assert.equal(
    tree.find((node) => node.props?.name === "escrita").props.options.animation,
    "slide_from_bottom",
  );
  assert.equal(
    tree.find((node) => node.props?.name === "sobre").props.options.animation,
    "fade",
  );
  animation = "none";
  tree = render();
  for (const name of ["escrita", "sobre"])
    assert.equal(
      tree.find((node) => node.props?.name === name).props.options.animation,
      "none",
    );
  session = null;
  assert(!available(render()).includes("(tabs)"));
});

test("preferência de reduzir movimento é lida, acompanha mudanças e remove o observador ao sair", async () => {
  let effect,
    cleanup,
    listener,
    removed = false,
    reduced = false;
  const theme = {
    colors: { surface: "cream", primary: "wine", background: "cream" },
    fonts: { titleLarge: { fontFamily: "system" } },
  };
  const api = load("src/shared/navigation/useStackOptions.ts", {
    react: {
      useState: () => [
        reduced,
        (value) => {
          reduced = value;
        },
      ],
      useEffect: (fn) => {
        effect = fn;
      },
    },
    "react-native": {
      AccessibilityInfo: {
        isReduceMotionEnabled: async () => true,
        addEventListener: (event, callback) => {
          assert.equal(event, "reduceMotionChanged");
          listener = callback;
          return {
            remove() {
              removed = true;
            },
          };
        },
      },
    },
    "react-native-paper": { useTheme: () => theme },
  });
  assert.equal(api.useStackOptions().animation, "slide_from_right");
  cleanup = effect();
  await new Promise(setImmediate);
  assert.equal(api.useStackOptions().animation, "none");
  listener(false);
  assert.equal(api.useStackOptions().animation, "slide_from_right");
  cleanup();
  assert(removed);
});

test("aviso de revogação incompleta continua visível após sair e pode ser fechado", () => {
  let session = null;
  let notice =
    "Você saiu neste aparelho, mas não foi possível confirmar a revogação no servidor.";
  const Card = Object.assign(() => null, {
    Content: "Content",
    Actions: "Actions",
  });
  const Welcome = load("src/app/index.tsx", {
    "react-native": { Image: "Image", View: "View" },
    "expo-router": { Redirect: "Redirect", router: {} },
    "react-native-paper": {
      Button: "Button",
      Card,
      HelperText: "HelperText",
      Icon: "Icon",
      Text: "Text",
      useTheme: () => ({ colors: {} }),
    },
    "../shared/store/ui-store": {
      useUIStore: (select) =>
        select({
          logoutNotice: notice,
          setLogoutNotice: (value) => {
            notice = value;
          },
        }),
    },
    "../shared/components/Screen": { Screen: "Screen" },
    "../features/auth/session": {
      useAuthStore: (select) => select({ session }),
    },
    "../../assets/brand/capitulando-logo.png": {},
  }).default;
  const tree = nodes(Welcome());
  assert.equal(
    tree.find((node) => node.type === "HelperText").props.children,
    notice,
  );
  tree
    .find(
      (node) =>
        node.type === "Button" && node.props.children === "Fechar aviso",
    )
    .props.onPress();
  assert(!nodes(Welcome()).some((node) => node.type === "HelperText"));
  session = { user: { id: "author" } };
  const authenticated = Welcome();
  assert.equal(authenticated.type, "Redirect");
  assert.equal(authenticated.props.href, "/painel");
});
