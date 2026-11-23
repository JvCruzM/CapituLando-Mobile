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
const editor = load("src/features/writing/components/editor-content.ts");
function environment(request = async () => ({})) {
  const values = new Map();
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => values.set(key, value),
    removeItem: async (key) => values.delete(key),
    getAllKeys: async () => [...values.keys()],
    multiRemove: async (keys) => keys.forEach((key) => values.delete(key)),
  };
  const auth = { session: { user: { id: "owner" }, sessionId: "session" } };
  const store = load("src/features/writing/writing-store.ts", {
    "@react-native-async-storage/async-storage": storage,
    "../../shared/api/account": { accountRequest: request },
    "./components/editor-content": editor,
    "../auth/session": { useAuthStore: { getState: () => auth } },
  });
  return { store, values, auth };
}
const config = {
  userId: "owner",
  sessionId: "session",
  storyId: "book",
  baseUrl: "/",
};
test("salvar capítulos diferentes simultaneamente preserva os dois e valida a versão", async () => {
  const { store } = environment();
  const make = (id) => ({
    id,
    storyId: "book",
    title: id,
    content: "original",
    kind: "chapter",
    version: 1,
  });
  await store.writeCachedEntries("owner", "book", {
    chapters: [make("a"), make("b")],
    drafts: [],
  });
  const cfg = { ...config, baseUrl: undefined };
  await Promise.all(
    ["a", "b"].map((id) =>
      store.saveEntryWithVersionControl(cfg, {
        ...make(id),
        expectedVersion: 1,
        content: "editado " + id,
      }),
    ),
  );
  assert.deepEqual(
    (await store.readCachedEntries("owner", "book")).chapters.map(
      (x) => x.content,
    ),
    ["editado a", "editado b"],
  );
  await assert.rejects(
    () =>
      store.saveEntryWithVersionControl(cfg, {
        ...make("a"),
        expectedVersion: 1,
      }),
    { code: "VERSION_CONFLICT" },
  );
});
test("a revisão da recuperação é separada da revisão do capítulo e limpar informa a história", async () => {
  const calls = [];
  const { store } = environment(async (req) => {
    calls.push(req);
    if (req.method === "GET")
      return {
        projectId: "book",
        chapterId: "a",
        title: "Texto",
        content: "<p>Olá</p>",
        type: "chapter",
        chapterRevision: 7,
        version: 18,
      };
    return { version: req.data.clear ? 20 : 19, sessionId: "session" };
  });
  const recovery = await store.fetchRemoteRecoveryFromApi(config, "book");
  assert.equal(recovery.version, 7);
  await store.syncRemoteRecoveryToApi(config, recovery);
  assert.equal(calls[1].data.expectedVersion, 18);
  assert.equal(calls[1].data.chapterVersion, 7);
  await store.syncRemoteRecoveryToApi(config, null);
  const clear = calls.at(-1);
  assert.equal(clear.data.projectId, "book");
  assert.equal(clear.data.expectedVersion, 19);
  assert.equal(clear.data.clear, true);
  assert(!clear.headers);
});
test("conflito devolve a versão correta do capítulo e respostas usam o cliente autenticado", async () => {
  const { store } = environment(async () => {
    throw Object.assign(new Error("conflito"), {
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          error: {
            details: {
              serverItem: {
                id: "a",
                story_id: "book",
                title: "Outro",
                content: "Texto",
                version: 5,
              },
            },
          },
        },
      },
    });
  });
  await assert.rejects(
    () =>
      store.saveEntryWithVersionControl(config, {
        id: "a",
        storyId: "book",
        title: "Meu",
        content: "Texto",
        kind: "chapter",
        expectedVersion: 4,
      }),
    (e) => e.code === "VERSION_CONFLICT" && e.serverEntry.version === 5,
  );
});
test("trocar de conta impede envio de uma operação da conta anterior", async () => {
  let sent = false;
  const { store, auth } = environment(async () => {
    sent = true;
    return {};
  });
  auth.session = { user: { id: "other" }, sessionId: "another" };
  await assert.rejects(() => store.fetchStoriesFromApi(config), /sessão mudou/);
  assert.equal(sent, false);
});
test("limpeza após restaurar backup remove somente o cache de escrita da conta atual", async () => {
  const { store } = environment();
  await store.saveLocalRecovery("owner", "book", { content: "Antigo" });
  await store.saveLocalRecovery("other", "book", { content: "Outra conta" });
  await store.writeCachedEntries("owner", "book", {
    chapters: [{ id: "a" }],
    drafts: [],
  });
  await store.clearWritingCache("owner");
  assert.equal(await store.loadLocalRecovery("owner", "book"), null);
  assert.equal(
    (await store.readCachedEntries("owner", "book")).chapters.length,
    0,
  );
  assert.equal(
    (await store.loadLocalRecovery("other", "book")).content,
    "Outra conta",
  );
});
test("texto formatado mantém palavras e texto simples escapa sinais de HTML", () => {
  const { store } = environment();
  assert.equal(
    store.countWords("<p>Olá <strong>mundo</strong></p><p>Outra linha</p>"),
    4,
  );
  assert.equal(editor.asHtml("2 < 3\nOutra linha"), "2 &lt; 3<br>Outra linha");
});

test("recuperação alterada no web sem sessionId também exige resolver o conflito", () => {
  const { store } = environment();
  const local = {
    storyId: "book",
    title: "Título",
    content: "Local",
    sessionId: "session",
  };
  const remote = {
    storyId: "book",
    title: "Título",
    content: "Remoto",
    sessionId: "",
  };
  assert(store.detectRecoveryConflict(local, remote, "session"));
  assert.equal(
    store.detectRecoveryConflict(
      local,
      { ...remote, storyId: "other" },
      "session",
    ),
    null,
  );
});
