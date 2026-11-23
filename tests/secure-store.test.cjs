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

function environment(options = {}) {
  const store = new Map();
  const calls = [];
  const secureStoreMock = {
    isAvailableAsync: async () =>
      options.available !== undefined ? options.available : true,
    setItemAsync: async (key, value, opts) => {
      calls.push({ method: "setItemAsync", key, value, opts });
      store.set(key, value);
    },
    getItemAsync: async (key, opts) => {
      calls.push({ method: "getItemAsync", key, opts });
      return store.get(key) ?? null;
    },
    deleteItemAsync: async (key, opts) => {
      calls.push({ method: "deleteItemAsync", key, opts });
      store.delete(key);
    },
  };

  const mod = load("src/shared/storage/secure-store.ts", {
    "expo-secure-store": secureStoreMock,
    "react-native": { Platform: { OS: options.os || "android" } },
  });

  return { mod, store, calls, secureStoreMock };
}

test("secureStore grava e recupera strings com expo-secure-store nativo", async () => {
  const { mod, store, calls } = environment();

  await mod.setItem("teste.chave", "valor-secreto");
  assert.equal(store.get("teste.chave"), "valor-secreto");

  const value = await mod.getItem("teste.chave");
  assert.equal(value, "valor-secreto");

  const exists = await mod.hasItem("teste.chave");
  assert.equal(exists, true);

  await mod.deleteItem("teste.chave");
  assert.equal(store.has("teste.chave"), false);

  const missing = await mod.getItem("teste.chave");
  assert.equal(missing, null);
  assert.equal(await mod.hasItem("teste.chave"), false);
});

test("secureStore serializa e deserializa objetos JSON com setObject e getObject", async () => {
  const { mod } = environment();
  const obj = { id: "123", name: "Capitu", settings: { dark: true } };

  await mod.setObject("app.user", obj);
  const retrieved = await mod.getObject("app.user");
  assert.deepEqual(retrieved, obj);

  // Tratamento de JSON corrompido
  await mod.setItem("app.corrompido", "{invalido");
  const fallback = await mod.getObject("app.corrompido");
  assert.equal(fallback, null);
});

test("secureStore suporta autenticação biométrica com setItemWithAuth e getItemWithAuth", async () => {
  const { mod, calls } = environment();

  await mod.setItemWithAuth("biometria.chave", "credencial-segura", "Acesso ao cofre");
  const lastSet = calls.find((c) => c.method === "setItemAsync" && c.key === "biometria.chave");
  assert.ok(lastSet);
  assert.equal(lastSet.opts?.requireAuthentication, true);
  assert.equal(lastSet.opts?.authenticationPrompt, "Acesso ao cofre");

  await mod.getItemWithAuth("biometria.chave", "Verifique sua identidade");
  const lastGet = calls.find((c) => c.method === "getItemAsync" && c.key === "biometria.chave");
  assert.ok(lastGet);
  assert.equal(lastGet.opts?.requireAuthentication, true);
  assert.equal(lastGet.opts?.authenticationPrompt, "Verifique sua identidade");
});

test("secureStore gerencia ciclo de sessão completo com saveAuthSession, getAuthSession e clearAuthSession", async () => {
  const { mod } = environment();
  const session = {
    sessionId: "sess-999",
    accessToken: "jwt-token-abc",
    refreshToken: "jwt-refresh-xyz",
    expiresAt: Date.now() + 3600000,
    user: { id: "usr-1", displayName: "Escritora" },
  };

  await mod.saveAuthSession(session);
  const savedSession = await mod.getAuthSession();
  assert.deepEqual(savedSession, session);

  const token = await mod.getAuthToken();
  assert.equal(token, "jwt-token-abc");

  await mod.clearAuthSession();
  assert.equal(await mod.getAuthSession(), null);
  assert.equal(await mod.getAuthToken(), null);
});

test("secureStore utiliza fallback em memória quando SecureStore nativo não está disponível", async () => {
  const { mod } = environment({ available: false, os: "android" });

  assert.equal(await mod.isSecureStoreAvailable(), false);

  await mod.setItem("fallback.chave", "memoria-123");
  assert.equal(await mod.getItem("fallback.chave"), "memoria-123");
  assert.equal(await mod.hasItem("fallback.chave"), true);

  await mod.deleteItem("fallback.chave");
  assert.equal(await mod.getItem("fallback.chave"), null);
});

test("saveSystemData, getSystemData e removeSystemData operam corretamente", async () => {
  const { mod } = environment();
  const config = { theme: "dark", notifications: true };

  await mod.saveSystemData("sistema.config", config);
  assert.deepEqual(await mod.getSystemData("sistema.config"), config);

  await mod.removeSystemData("sistema.config");
  assert.equal(await mod.getSystemData("sistema.config"), null);
});
