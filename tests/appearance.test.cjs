const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  ts = require("typescript");
function load(mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync("src/shared/theme/useAppBackground.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  new Function("require", "module", "exports", code)(
    (name) => mocks[name],
    module,
    module.exports,
  );
  return module.exports;
}
test("fundo nativo acompanha o tema antes da pintura e a aparência retorna ao sistema ao sair", async () => {
  const effects = [],
    colors = [],
    schemes = [];
  const { useAppBackground } = load({
    react: {
      useLayoutEffect: (effect) => effects.unshift(effect),
      useEffect: (effect) => effects.push(effect),
    },
    "react-native": {
      Platform: { OS: "android" },
      Appearance: { setColorScheme: (value) => schemes.push(value) },
    },
    "expo-system-ui": {
      setBackgroundColorAsync: async (color) => colors.push(color),
    },
  });
  useAppBackground("#120e17", "dark");
  effects[0]();
  const cleanup = effects[1]();
  await new Promise(setImmediate);
  assert.deepEqual(colors, ["#120e17"]);
  assert.deepEqual(schemes, ["dark"]);
  cleanup();
  assert.deepEqual(schemes, ["dark", "auto"]);
  effects.length = 0;
  useAppBackground("#fcf8f2", "system");
  effects[0]();
  effects[1]();
  await new Promise(setImmediate);
  assert.equal(colors.at(-1), "#fcf8f2");
  assert.equal(schemes.at(-1), "auto");
});
test("navegador aplica a cor sem chamar a API de aparência exclusiva do nativo", async () => {
  const effects = [],
    colors = [];
  const { useAppBackground } = load({
    react: {
      useLayoutEffect: (effect) => effects.push(effect),
      useEffect: (effect) => effects.push(effect),
    },
    "react-native": { Platform: { OS: "web" }, Appearance: {} },
    "expo-system-ui": {
      setBackgroundColorAsync: async (color) => colors.push(color),
    },
  });
  useAppBackground("#fcf8f2", "light");
  for (const effect of effects) effect();
  await new Promise(setImmediate);
  assert.deepEqual(colors, ["#fcf8f2"]);
});

test("indisponibilidade do ajuste nativo de fundo não impede a abertura do aplicativo", async () => {
  const effects = [],
    schemes = [];
  const mocks = {
    react: {
      useLayoutEffect: (effect) => effects.push(effect),
      useEffect: (effect) => effects.push(effect),
    },
    "react-native": {
      Platform: { OS: "android" },
      Appearance: { setColorScheme: (mode) => schemes.push(mode) },
    },
  };
  Object.defineProperty(mocks, "expo-system-ui", {
    get() {
      throw new Error("Native module unavailable");
    },
  });
  const { useAppBackground } = load(mocks);
  useAppBackground("#120e17", "dark");
  for (const effect of effects) effect();
  await new Promise(setImmediate);
  assert.deepEqual(schemes, ["dark"]);
});
