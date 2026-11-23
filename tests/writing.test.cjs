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

const bridge = load("src/features/writing/components/editor-bridge.ts");
function nativeEditor() {
  let html = "",
    caret = 0,
    replacements = 0,
    editableWrites = 0,
    editable = true;
  const listeners = {},
    messages = [];
  const editor = {
    style: {},
    get innerHTML() {
      return html;
    },
    set innerHTML(value) {
      html = value;
      caret = 0;
      replacements++;
    },
    get isContentEditable() {
      return editable;
    },
    set contentEditable(value) {
      editable = value === "true";
      editableWrites++;
    },
    addEventListener: (name, fn) => {
      listeners[name] = fn;
    },
  };
  const window = {
    ReactNativeWebView: {
      postMessage: (value) => messages.push(JSON.parse(value)),
    },
  };
  new Function("window", "document", bridge.editorBridge)(window, {
    getElementById: () => editor,
    body: { style: {} },
  });
  return {
    set: window.setEditor,
    type(value) {
      html = value;
      caret = value.length;
      listeners.input();
      return messages.at(-1);
    },
    get html() {
      return html;
    },
    get caret() {
      return caret;
    },
    get replacements() {
      return replacements;
    },
    get editableWrites() {
      return editableWrites;
    },
  };
}
test("espaços emitidos pelo editor não são convertidos e reinseridos no campo", () => {
  const dom = nativeEditor(),
    state = { applied: null, echoes: [] };
  dom.set(editor.asHtml(bridge.nextEditorContent(state, "Olá")), null, true, 0);
  const message = dom.type("Olá&nbsp;");
  state.echoes.push(message.html);
  assert.equal(bridge.nextEditorContent(state, message.html), null);
  dom.set(null, { fontSize: "18px" }, true, message.revision);
  assert.equal(dom.html, "Olá&nbsp;");
  assert.equal(dom.caret, "Olá&nbsp;".length);
  assert.equal(dom.replacements, 1);
  assert.equal(dom.editableWrites, 0);
});
test("eco atrasado de uma tecla anterior não substitui texto digitado depois", () => {
  const state = { applied: "", echoes: ["Um", "Um&nbsp;", "Um&nbsp;texto"] };
  assert.equal(bridge.nextEditorContent(state, "Um"), null);
  assert.equal(bridge.nextEditorContent(state, "Um&nbsp;texto"), null);
  assert.deepEqual(state.echoes, []);
  assert.equal(
    bridge.nextEditorContent(state, "<p>Outro capítulo</p>"),
    "<p>Outro capítulo</p>",
  );
});
test("comandos antigos da ponte não reposicionam o cursor após nova digitação", () => {
  const dom = nativeEditor();
  dom.set("Inicial", null, true, 0);
  dom.type("Inicial novo");
  const caret = dom.caret;
  dom.set("Inicial antigo", null, true, 0);
  assert.equal(dom.html, "Inicial novo");
  assert.equal(dom.caret, caret);
  dom.set("<p>Outro capítulo</p>", null, true, 1);
  assert.equal(dom.html, "<p>Outro capítulo</p>");
});
test("espaços HTML existentes são preservados ao abrir textos simples", () => {
  assert.equal(editor.asHtml("Olá&nbsp;mundo"), "Olá&nbsp;mundo");
  assert.equal(editor.asHtml("A & B"), "A &amp; B");
});
