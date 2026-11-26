const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
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
    ownerDocument: { defaultView: null },
    querySelectorAll: () => [],
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

test("status é enviado à API e conservado no cache e na recuperação", async () => {
  const calls = [];
  const { store, values } = environment(async (req) => {
    calls.push(req);
    return {
      id: "c",
      storyId: "book",
      ...req.data,
      version: 2,
      status: "PUBLISHED",
    };
  });
  const result = await store.saveEntryWithVersionControl(config, {
    storyId: "book",
    title: "Publicado",
    content: "<p><b>Olá</b></p>",
    kind: "chapter",
    status: "published",
  });
  assert.equal(calls[0].data.status, "PUBLISHED");
  assert.equal(result.saved.status, "published");
  assert.equal(
    (await store.readCachedEntries("owner", "book")).chapters[0].status,
    "published",
  );
  values.set(
    "@capitulando:recovery_v3:owner:book",
    JSON.stringify({ content: "Antigo", kind: "draft" }),
  );
  assert.equal(
    (await store.loadLocalRecovery("owner", "book")).status,
    "draft",
  );
  await store.clearLocalRecovery("owner", "book");
  assert.equal(await store.loadLocalRecovery("owner", "book"), null);
});
test("exportações preservam HTML no PDF e produzem arquivo TXT e PDF reais no dispositivo", async () => {
  const content = load("src/features/writing/export-content.ts", {
    "./components/editor-content": editor,
  });
  assert.equal(
    content.writingText("Título", "<p><b>Olá</b></p>"),
    "Título\n\nOlá\n",
  );
  const html = content.writingHtml(
    "<Título>",
    '<p><b>Olá</b><u>Mundo</u></p><script>alert(1)</script><img src="x" onerror="bad()">',
  );
  assert(html.includes("<b>Olá</b>"));
  assert(html.includes("&lt;Título&gt;"));
  assert(!html.includes("alert(1)"));
  assert(!html.includes("<img"));
  const calls = [];
  const exporter = load("src/features/writing/export-writing.ts", {
    "./export-content": content,
    "react-native": { Platform: { OS: "ios" } },
    "expo-file-system/legacy": {
      cacheDirectory: "cache/",
      EncodingType: { UTF8: "utf8", Base64: "base64" },
      deleteAsync: async () => {},
      writeAsStringAsync: async (...a) => calls.push(["txt", ...a]),
    },
    "expo-print": {
      printToFileAsync: async (options) => {
        calls.push(["pdf", options]);
        return { uri: "file:///forbidden/print.pdf", base64: "JVBERi0=" };
      },
    },
    "expo-sharing": {
      isAvailableAsync: async () => true,
      shareAsync: async (...a) => calls.push(["share", ...a]),
    },
  });
  await exporter.exportWritingAsTxt("Título", "<p>Texto</p>");
  await exporter.exportWritingAsPdf("Título", "<b>Texto</b>");
  assert(calls[0][1].endsWith(".txt"));
  assert.equal(calls[0][2], "Título\n\nTexto\n");
  assert.equal(calls[2][1].base64, true);
  assert.equal(calls[3][2], "JVBERi0=");
  assert.equal(calls[3][3].encoding, "base64");
  assert(calls[4][1].startsWith("cache/"));
  assert(calls[4][1].endsWith(".pdf"));
  assert.equal(calls[4][2].mimeType, "application/pdf");
});
test("barra de formatação nativa emite HTML e ignora comandos desconhecidos", () => {
  let html = "Texto";
  const events = {},
    messages = [],
    commands = [];
  const editor = {
    ownerDocument: { defaultView: null },
    querySelectorAll: () => [],
    isContentEditable: true,
    focus() {},
    get innerHTML() {
      return html;
    },
    addEventListener(name, fn) {
      events[name] = fn;
    },
    dispatchEvent() {
      events.input();
    },
  };
  const window = {
    ReactNativeWebView: {
      postMessage: (data) => messages.push(JSON.parse(data)),
    },
  };
  const document = {
    getElementById: () => editor,
    execCommand(command) {
      commands.push(command);
      html = "<b>" + html + "</b>";
    },
  };
  new Function("window", "document", bridge.editorBridge)(window, document);
  window.formatEditor("bold");
  assert.equal(messages[0].html, "<b>Texto</b>");
  assert.equal(messages[0].revision, 1);
  window.formatEditor("unknown");
  assert.deepEqual(commands, ["bold"]);
});

test("excluir capítulo preserva recuperação antiga como rascunho sem referência inválida", async () => {
  const { store, values } = environment();
  values.set(
    "@capitulando:recovery_v3:owner:book",
    JSON.stringify({
      itemId: "a",
      kind: "chapter",
      version: 3,
      content: "Não perder",
    }),
  );
  await store.forgetCachedChapter("owner", "book", "a");
  const state = await store.loadLocalRecovery("owner", "book");
  assert.equal(state.itemId, null);
  assert.equal(state.status, "draft");
  assert.equal(state.version, 0);
  assert.equal(state.content, "Não perder");
});

test("exportação Android escolhe pasta e respeita cancelamento sem abrir compartilhamento", async () => {
  const calls = [];
  let granted = true;
  const exporter = load("src/features/writing/export-writing.ts", {
    "react-native": { Platform: { OS: "android" } },
    "./export-content": {
      fileName: () => "titulo",
      writingText: () => "Texto",
      writingHtml: () => "<p>Texto</p>",
    },
    "expo-file-system/legacy": {
      EncodingType: { UTF8: "utf8", Base64: "base64" },
      StorageAccessFramework: {
        requestDirectoryPermissionsAsync: async () => ({
          granted,
          directoryUri: "folder",
        }),
        createFileAsync: async (...args) => {
          calls.push(["create", ...args]);
          return "content://chosen";
        },
      },
      writeAsStringAsync: async (...args) => calls.push(["write", ...args]),
    },
    "expo-print": { printToFileAsync: async () => ({ base64: "JVBERi0=" }) },
    "expo-sharing": {
      shareAsync: () => {
        throw Error("não compartilhar no Android");
      },
    },
  });
  await exporter.exportWritingAsTxt("t", "x");
  await exporter.exportWritingAsPdf("t", "x");
  assert.equal(calls[0][3], "text/plain");
  assert.equal(calls[2][3], "application/pdf");
  assert.equal(calls[3][2], "JVBERi0=");
  granted = false;
  await exporter.exportWritingAsTxt("t", "x");
  assert.equal(calls.length, 4);
});
test("conflito de recuperação bloqueia escritas já enfileiradas até uma escolha explícita", async () => {
  let writes = 0;
  let conflict = true;
  const { store } = environment(async (req) => {
    if (req.method === "GET")
      return {
        version: 1,
        projectId: "book",
        content: "Outra sessão",
        title: "Outro",
        sessionId: "other",
      };
    writes++;
    if (conflict)
      throw {
        isAxiosError: true,
        response: {
          status: 409,
          data: {
            error: {
              details: {
                serverState: {
                  projectId: "book",
                  title: "Outro",
                  content: "Outra sessão",
                  sessionId: "other",
                  version: 2,
                },
              },
            },
          },
        },
      };
    return { version: 3 };
  });
  await store.fetchRemoteRecoveryFromApi(config, "book");
  const state = {
    storyId: "book",
    itemId: null,
    content: "Meu",
    title: "Meu",
    kind: "draft",
    status: "draft",
    version: 0,
    sessionId: "session",
  };
  const results = await Promise.allSettled([
    store.syncRemoteRecoveryToApi(config, state),
    store.syncRemoteRecoveryToApi(config, state),
  ]);
  assert(
    results.every(
      (r) => r.status === "rejected" && r.reason.code === "SESSION_CONFLICT",
    ),
  );
  assert.equal(writes, 1);
  await assert.rejects(() => store.syncRemoteRecoveryToApi(config, null), {
    code: "SESSION_CONFLICT",
  });
  assert.equal(writes, 1);
  conflict = false;
  await store.syncRemoteRecoveryToApi(config, state, true);
  await store.syncRemoteRecoveryToApi(config, state);
  assert.equal(writes, 3);
});
test("imagens respeitam proporção e foco de topo, centro e base", () => {
  const { imageFrame } = load(
    "src/features/universe/components/image-frame.ts",
  );
  assert.deepEqual(imageFrame(200, 200, 400, 800, "contain"), {
    width: 100,
    height: 200,
    left: 50,
    top: 0,
  });
  assert.equal(imageFrame(200, 200, 400, 800, "cover", "top").top, 0);
  assert.equal(imageFrame(200, 200, 400, 800, "cover", "center").top, -100);
  assert.equal(imageFrame(200, 200, 400, 800, "cover", "bottom").top, -200);
});
test("formulários nativos não têm texto solto fora de Text", () => {
  for (const file of [
    "CreateEditModal.tsx",
    "ItemDetailModal.tsx",
    "CharactersView.tsx",
    "EncyclopediaView.tsx",
    "TimelineView.tsx",
  ]) {
    const path = "src/features/universe/components/" + file;
    const source = ts.createSourceFile(
      path,
      fs.readFileSync(path, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const failures = [];
    function walk(node) {
      if (ts.isJsxElement(node)) {
        const tag = node.openingElement.tagName.getText(source);
        if (
          [
            "View",
            "ScrollView",
            "Portal",
            "Dialog",
            "Dialog.ScrollArea",
            "Dialog.Actions",
            "Card",
            "Surface",
          ].includes(tag)
        ) {
          for (const child of node.children)
            if (
              (ts.isJsxText(child) && child.text.trim()) ||
              (ts.isJsxExpression(child) &&
                child.expression &&
                ts.isStringLiteral(child.expression))
            )
              failures.push(child.getText(source));
        }
      }
      ts.forEachChild(node, walk);
    }
    walk(source);
    assert.deepEqual(failures, [], file);
  }
});

test("formulário nativo ignora ecos atrasados e só reaplica texto ao carregar outro registro", () => {
  const refs = [];
  let index = 0,
    effects = [];
  const hooks = {
    forwardRef: (fn) => fn,
    useRef: (value) => refs[index++] ?? (refs[index - 1] = { current: value }),
    useCallback: (fn) => fn,
    useEffect: (fn) => effects.push(fn),
  };
  const { StableFormInput } = load(
    "src/features/universe/components/StableFormInput.tsx",
    {
      react: hooks,
      "react-native": { TextInput: "NativeInput" },
      "react-native-paper": { TextInput: "PaperInput" },
      "../../writing/components/editor-bridge": bridge,
    },
  );
  let caret = 0;
  const changes = [];
  const instance = {
    setNativeProps: (props) => {
      changes.push(props.text);
      caret = 0;
    },
  };
  function render(value) {
    index = 0;
    effects = [];
    const paper = StableFormInput({ value });
    const wrapper = paper.props.render({ value, onChangeText: () => {} });
    const native = wrapper.type(wrapper.props, () => {});
    native.props.ref(instance);
    effects.forEach((fn) => fn());
    return native;
  }
  const first = render("");
  first.props.onChangeText("A");
  first.props.onChangeText("A ");
  caret = 2;
  assert.equal(render("A").props.defaultValue, "");
  render("A ");
  assert.equal(caret, 2);
  assert.deepEqual(changes, []);
  render("Outro registro");
  assert.deepEqual(changes, ["Outro registro"]);
});

test("dimensões da imagem são lidas tanto no evento nativo quanto no navegador", () => {
  const { loadedImageSize } = load(
    "src/features/universe/components/image-frame.ts",
  );
  assert.deepEqual(loadedImageSize({ source: { width: 200, height: 400 } }), {
    width: 200,
    height: 400,
  });
  assert.deepEqual(
    loadedImageSize({ target: { naturalWidth: 400, naturalHeight: 200 } }),
    { width: 400, height: 200 },
  );
  assert.equal(loadedImageSize({}), null);
});

test("recuperação já limpa em outra sessão atualiza a revisão sem abrir conflito de texto vazio", async () => {
  let writes = 0;
  const { store } = environment(async (req) => {
    if (req.method === "GET") return { version: 1 };
    writes++;
    if (writes === 1)
      throw {
        isAxiosError: true,
        response: {
          status: 409,
          data: {
            error: { details: { serverState: { version: 2, content: "" } } },
          },
        },
      };
    assert.equal(req.data.expectedVersion, 2);
    return { version: 3 };
  });
  await store.fetchRemoteRecoveryFromApi(config, "book");
  await store.syncRemoteRecoveryToApi(config, {
    storyId: "book",
    content: "Meu texto",
    title: "Título",
    kind: "chapter",
    status: "in_review",
    version: 0,
  });
  assert.equal(writes, 2);
});

test("H1 e H2 geram blocos HTML distintos na ponte nativa", () => {
  const calls = [],
    messages = [],
    events = {};
  const editor = {
    ownerDocument: { defaultView: null },
    querySelectorAll: () => [],
    isContentEditable: true,
    innerHTML: "Texto",
    focus() {},
    addEventListener: (name, fn) => (events[name] = fn),
    dispatchEvent: () => events.input(),
  };
  const window = {
    ReactNativeWebView: {
      postMessage: (data) => messages.push(JSON.parse(data)),
    },
  };
  const document = {
    getElementById: () => editor,
    execCommand: (name, ui, tag) => {
      calls.push([name, tag]);
      editor.innerHTML = "<" + tag + ">Texto</" + tag + ">";
    },
  };
  new Function("window", "document", bridge.editorBridge)(window, document);
  window.formatEditor("h1");
  window.formatEditor("h2");
  assert.deepEqual(calls, [
    ["formatBlock", "h1"],
    ["formatBlock", "h2"],
  ]);
  assert.deepEqual(
    messages.map((m) => m.html),
    ["<h1>Texto</h1>", "<h2>Texto</h2>"],
  );
  editor.isContentEditable = false;
  window.formatEditor("bold");
  assert.equal(calls.length, 2);
});

test("leitura individual usa sessão autenticada e mantém HTML, status e revisão zero no cache", async () => {
  const calls = [];
  const { store, auth } = environment(async (req) => {
    calls.push(req);
    return {
      id: "a",
      story_id: "book",
      title: "Capítulo",
      content: "<h1>Título</h1><p>Texto</p>",
      status: "IN_REVIEW",
      version: 0,
    };
  });
  const entry = await store.fetchSingleEntryFromApi(config, "book", "a");
  assert.equal(calls[0].url, "/api/writing/stories/book/items/a");
  assert.equal(calls[0].method, "GET");
  assert.equal(entry.version, 0);
  assert.equal(entry.status, "in_review");
  assert.equal(entry.content, "<h1>Título</h1><p>Texto</p>");
  assert.deepEqual((await store.readCachedEntries("owner", "book")).chapters, [
    entry,
  ]);
  auth.session = { user: { id: "other" }, sessionId: "other-session" };
  await assert.rejects(
    () => store.fetchSingleEntryFromApi(config, "book", "a"),
    /sessão mudou/,
  );
  assert.equal(calls.length, 1);
});

test("exclusão autenticada limpa apenas o capítulo e preserva recuperação como rascunho", async () => {
  const calls = [];
  const { store } = environment(async (req) => {
    calls.push(req);
    return {};
  });
  await store.writeCachedEntries("owner", "book", {
    chapters: [{ id: "a" }, { id: "b" }],
    drafts: [],
  });
  await store.saveLocalRecovery("owner", "book", {
    itemId: "a",
    content: "Texto pendente",
    kind: "chapter",
    version: 4,
  });
  await store.deleteEntryFromStory(config, "book", "a");
  assert.equal(calls[0].method, "DELETE");
  assert.equal(calls[0].url, "/api/writing/stories/book/items/a");
  assert.deepEqual(
    (await store.readCachedEntries("owner", "book")).chapters.map((e) => e.id),
    ["b"],
  );
  const recovery = await store.loadLocalRecovery("owner", "book");
  assert.equal(recovery.itemId, null);
  assert.equal(recovery.content, "Texto pendente");
});

test("leitor preserva HTML, cancela respostas de telas fechadas e mostra falhas de atualização", async () => {
  const slots = [];
  let cursor = 0,
    effects = [],
    dirty = false;
  const hooks = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots))
        slots[i] = typeof initial === "function" ? initial() : initial;
      return [
        slots[i],
        (next) => {
          const value = typeof next === "function" ? next(slots[i]) : next;
          if (!Object.is(slots[i], value)) {
            slots[i] = value;
            dirty = true;
          }
        },
      ];
    },
    useRef(initial) {
      const i = cursor++;
      return (slots[i] ??= { current: initial });
    },
    useEffect(effect, deps) {
      const i = cursor++,
        previous = slots[i];
      if (!previous || deps.some((d, n) => !Object.is(d, previous.deps[n]))) {
        effects.push(() => {
          previous?.cleanup?.();
          slots[i] = { deps, cleanup: effect() };
        });
      }
    },
  };
  const { ChapterListModal } = load(
    "src/features/writing/components/ChapterListModal.tsx",
    {
      react: hooks,
      "react-native": Object.fromEntries(
        [
          "Modal",
          "View",
          "Text",
          "TouchableOpacity",
          "ScrollView",
          "ActivityIndicator",
        ]
          .map((n) => [n, n])
          .concat([["StyleSheet", { create: (s) => s }]]),
      ),
      "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
      "lucide-react-native": Object.fromEntries(
        ["X", "BookOpen", "Edit3", "Trash2", "ArrowLeft", "PenTool"].map(
          (n) => [n, n],
        ),
      ),
      "./RichTextEditor": { RichTextEditor: "Reader" },
      "./editor-content": editor,
      "../writing-store": { getStatusLabel: () => "Em revisão" },
    },
  );
  const entry = {
    id: "a",
    title: "Primeiro",
    content: "<h1>Título</h1><p>Texto</p>",
    kind: "chapter",
    status: "in_review",
    version: 0,
    wordCount: 2,
  };
  let resolve, reject;
  let props = {
    visible: true,
    kind: "chapter",
    entries: [entry],
    isDark: false,
    onLoadEntry: () =>
      new Promise((yes, no) => {
        resolve = yes;
        reject = no;
      }),
    onClose: () => {
      props = { ...props, visible: false };
    },
    onOpenInEditor() {},
    onDeleteEntry() {},
  };
  function render() {
    let tree;
    do {
      dirty = false;
      cursor = 0;
      effects = [];
      tree = ChapterListModal(props);
      effects.forEach((run) => run());
    } while (dirty);
    return tree;
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
  const clickRead = (tree) =>
    nodes(tree)
      .find((n) => n.props?.onPress && text(n) === "Ler")
      .props.onPress();
  let tree = render();
  clickRead(tree);
  tree = render();
  assert.equal(
    nodes(tree).find((n) => n.type === "Reader").props.value,
    entry.content,
  );
  const resolveOld = resolve;
  nodes(tree)
    .find((n) => n.type === "Modal")
    .props.onRequestClose();
  render();
  const second = {
    ...entry,
    id: "b",
    title: "Segundo",
    content: "<p>Segundo</p>",
  };
  props = { ...props, visible: true, initialEntry: second };
  tree = render();
  resolveOld({ ...entry, content: "Resposta antiga" });
  await new Promise(setImmediate);
  tree = render();
  assert.equal(
    nodes(tree).find((n) => n.type === "Reader").props.value,
    second.content,
  );
  nodes(tree)
    .find((n) => n.props?.onPress && text(n) === "Voltar à lista")
    .props.onPress();
  tree = render();
  clickRead(tree);
  render();
  reject(new Error("Sem conexão"));
  await new Promise(setImmediate);
  tree = render();
  assert(
    nodes(tree).some(
      (n) =>
        n.props?.accessibilityRole === "alert" && text(n) === "Sem conexão",
    ),
  );
  assert.equal(
    nodes(tree).find((n) => n.type === "Reader").props.value,
    entry.content,
  );
  assert(!text(tree).includes("Espaço de Escrita"));
  let backs = 0,
    deleted = [],
    failDelete = true;
  props = {
    ...props,
    onBackToList: () => {
      backs++;
      props = { ...props, visible: false };
    },
    onDeleteEntry: async (target) => {
      deleted.push(target.id);
      if (failDelete) throw new Error("Falha na exclusão");
    },
  };
  const click = (label) => {
    nodes(tree)
      .find((n) => n.props?.onPress && text(n) === label)
      .props.onPress();
    tree = render();
  };
  tree = render();
  click("Excluir");
  assert(text(tree).includes("Excluir texto?"));
  click("Cancelar");
  assert.equal(backs, 0);
  assert.equal(deleted.length, 0);
  assert.equal(
    nodes(tree).find((n) => n.type === "Reader").props.value,
    entry.content,
  );
  click("Excluir");
  click("Confirmar exclusão");
  await new Promise(setImmediate);
  tree = render();
  assert(text(tree).includes("Falha na exclusão"));
  assert.equal(backs, 0);
  failDelete = false;
  click("Confirmar exclusão");
  await new Promise(setImmediate);
  tree = render();
  assert.equal(backs, 1);
  assert.deepEqual(deleted, ["a", "a"]);
});

test("Ler abre sobre a listagem padrão de capítulos e só Editar navega ao espaço de escrita", () => {
  const values = [];
  let cursor = 0;
  const navigations = [];
  const chapter = {
    id: "chapter",
    storyId: "book",
    title: "Capítulo",
    content: "<h1>Título</h1>",
    kind: "chapter",
    status: "IN_REVIEW",
    version: 0,
    wordCount: 1,
  };
  const session = { user: { id: "owner" }, sessionId: "session" };
  const { default: ChaptersScreen } = load(
    "src/features/chapters/screens/ChaptersScreen.tsx",
    {
      react: {
        useState(initial) {
          const i = cursor++;
          if (!(i in values)) values[i] = initial;
          return [values[i], (value) => (values[i] = value)];
        },
      },
      "expo-router": {
        router: { push: (target) => navigations.push(target) },
        useLocalSearchParams: () => ({ id: "book", title: "Livro" }),
      },
      "@tanstack/react-query": {
        useQuery: () => ({ data: { chapters: [chapter], drafts: [] } }),
        useQueryClient: () => ({ invalidateQueries: async () => {} }),
        useMutation: () => ({
          isPending: false,
          reset() {},
          mutate() {},
          mutateAsync: async () => {},
        }),
      },
      "react-native-paper": Object.fromEntries(
        ["Button", "Card", "Dialog", "HelperText", "Portal", "Text"]
          .map((name) => [
            name,
            Object.assign(() => null, {
              Content: name + ".Content",
              Actions: name + ".Actions",
              Title: name + ".Title",
            }),
          ])
          .concat([["useTheme", () => ({ dark: false })]]),
      ),
      "../../auth/session": {
        useAuthStore: (selector) => selector({ session }),
      },
      "../../../shared/api/account": {
        accountRequest() {},
        accountErrorMessage() {},
      },
      "../../../shared/components/AccountQueryStatus": {
        AccountQueryStatus: "AccountQueryStatus",
      },
      "../../../shared/components/Screen": { Screen: "Screen" },
      "../../writing/components/ChapterListModal": {
        ChapterListModal: "ChapterListModal",
      },
      "../../writing/writing-store": {
        forgetCachedChapter: async () => {},
        fetchSingleEntryFromApi: async () => chapter,
        normalizeItemStatus: (status) => status.toLowerCase(),
      },
    },
  );
  const render = () => {
    cursor = 0;
    return ChaptersScreen();
  };
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
  let tree = render();
  nodes(tree)
    .find((n) => n.props?.onPress && text(n) === "Ler")
    .props.onPress();
  tree = render();
  let reader = nodes(tree).find((n) => n.type === "ChapterListModal");
  assert.equal(reader.props.visible, true);
  assert.equal(reader.props.initialEntry.id, "chapter");
  assert.equal(reader.props.initialEntry.status, "in_review");
  assert.equal(navigations.length, 0);
  reader.props.onBackToList();
  tree = render();
  assert.equal(
    nodes(tree).find((n) => n.type === "ChapterListModal").props.visible,
    false,
  );
  assert.equal(navigations.length, 0);
  reader.props.onOpenInEditor(chapter);
  assert.deepEqual(navigations, [
    {
      pathname: "/escrita",
      params: { storyId: "book", itemId: "chapter", mode: "edit" },
    },
  ]);
});

test("ponte nativa continua executável quando o motor não fornece o código-fonte das funções", () => {
  const compiled = ts.transpileModule(
    fs.readFileSync("src/features/writing/components/editor-bridge.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const initialize = new Function("require", "module", "exports", compiled);
  const module = { exports: {} };
  const original = Function.prototype.toString;
  try {
    Function.prototype.toString = function () {
      return "function () { [bytecode] }";
    };
    initialize(() => ({ prepareEditorBlocks() {} }), module, module.exports);
  } finally {
    Function.prototype.toString = original;
  }
  assert.doesNotThrow(
    () => new Function("window", "document", module.exports.editorBridge),
  );
});

function writingToolbar() {
  const values = [],
    refs = [],
    exports = [];
  let cursor = 0,
    refCursor = 0,
    finishExport;
  const hooks = {
    useState(initial) {
      const i = cursor++;
      if (!(i in values)) values[i] = i === 0 ? false : initial;
      return [
        values[i],
        (next) => {
          values[i] = typeof next === "function" ? next(values[i]) : next;
        },
      ];
    },
    useRef(initial) {
      return refs[refCursor++] ?? (refs[refCursor - 1] = { current: initial });
    },
    useEffect() {},
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
  };
  const store = {
    countWords: () => 0,
    getStatusLabel: (status) =>
      ({
        draft: "Rascunho",
        in_review: "Em revisão",
        published: "Publicado",
        archived: "Arquivado",
      })[status],
  };
  const { WritingScreen } = load(
    "src/features/writing/screens/WritingScreen.tsx",
    {
      react: hooks,
      "react-native": {
        View: "View",
        Text: "Text",
        TextInput: "TextInput",
        TouchableOpacity: "TouchableOpacity",
        ScrollView: "ScrollView",
        ActivityIndicator: "ActivityIndicator",
        SafeAreaView: "SafeAreaView",
        KeyboardAvoidingView: "KeyboardAvoidingView",
        StyleSheet: { create: (styles) => styles },
        Platform: { OS: "android", select: (choices) => choices.android },
        Share: { share: async () => {} },
      },
      "lucide-react-native": new Proxy({}, { get: (_, name) => String(name) }),
      "react-native-paper": {
        useTheme: () => ({ dark: false }),
        Button: "Button",
        Portal: "Portal",
        Dialog: Object.assign(() => null, {
          Title: "Dialog.Title",
          Content: "Dialog.Content",
          Actions: "Dialog.Actions",
        }),
      },
      "expo-clipboard": { setStringAsync: async () => {} },
      "../writing-store": store,
      "../../auth/session": {
        useAuthStore: {
          getState: () => ({ session: { sessionId: "session" } }),
        },
      },
      "../components/editor-content": editor,
      "../components/ChapterListModal": {
        ChapterListModal: "ChapterListModal",
      },
      "../components/ChapterConflictModal": {
        ChapterConflictModal: "ChapterConflictModal",
      },
      "../components/SessionConflictModal": {
        SessionConflictModal: "SessionConflictModal",
      },
      "../components/RichTextEditor": { RichTextEditor: "RichTextEditor" },
      "../export-writing": {
        exportWritingAsTxt: async (...args) => {
          exports.push({ format: "txt", args });
          await new Promise((resolve) => {
            finishExport = resolve;
          });
        },
        exportWritingAsPdf: async (...args) => {
          exports.push({ format: "pdf", args });
          await new Promise((resolve) => {
            finishExport = resolve;
          });
        },
      },
    },
  );
  const nodes = (tree) =>
    Array.isArray(tree)
      ? tree.flatMap(nodes)
      : tree && typeof tree === "object"
        ? [tree, ...nodes(tree.props?.children)]
        : [];
  const text = (tree) =>
    typeof tree === "string"
      ? tree
      : Array.isArray(tree)
        ? tree.map(text).join("")
        : tree?.props
          ? text(tree.props.children)
          : "";
  let tree;
  return {
    render() {
      cursor = 0;
      refCursor = 0;
      tree = WritingScreen({
        userId: "owner",
        storyId: "book",
        stories: [{ id: "book", title: "Livro" }],
      });
      return tree;
    },
    control(label) {
      return nodes(tree).find(
        (node) =>
          node.props?.onPress &&
          (node.props.accessibilityLabel === label || text(node) === label),
      );
    },
    editor() {
      return nodes(tree).find((node) => node.type === "RichTextEditor");
    },
    get exports() {
      return exports;
    },
    finish() {
      finishExport();
    },
  };
}

test("modo foco oculta os estados e ao sair preserva o estado e o texto do capítulo", () => {
  const ui = writingToolbar();
  ui.render();
  assert(ui.control("Em revisão"));
  ui.control("Publicado").props.onPress();
  ui.render();
  const contentProp =
    ui.editor().props.onChange ?? ui.editor().props.onChangeText;
  assert.equal(typeof contentProp, "function");
  contentProp("<p>Minha história</p>");
  ui.render();
  ui.control("Modo Foco").props.onPress();
  ui.render();
  for (const status of ["Rascunho", "Em revisão", "Publicado", "Arquivado"])
    assert(!ui.control(status));
  assert.equal(
    ui.editor().props.value ?? ui.editor().props.content,
    "<p>Minha história</p>",
  );
  ui.control("Sair do Foco").props.onPress();
  ui.render();
  assert.equal(ui.control("Publicado").props.mode, "contained");
  assert.equal(
    ui.editor().props.value ?? ui.editor().props.content,
    "<p>Minha história</p>",
  );
});

test("TXT e PDF usam controles do editor e mostram carregamento somente no formato escolhido", async () => {
  const ui = writingToolbar();
  ui.render();
  for (const format of ["TXT", "PDF"]) {
    const button = ui.control("Exportar " + format);
    assert.equal(button.type, ui.control("Tipografia").type);
    const pending = button.props.onPress();
    ui.render();
    assert.equal(
      ui.control("Exportar " + format).props.accessibilityState.busy,
      true,
    );
    assert.equal(
      ui.control("Exportar " + (format === "TXT" ? "PDF" : "TXT")).props
        .accessibilityState.busy,
      false,
    );
    assert(
      ui.control("Exportar TXT").props.disabled &&
        ui.control("Exportar PDF").props.disabled,
    );
    ui.finish();
    await new Promise(setImmediate);
    await pending;
    ui.render();
    assert.equal(ui.exports.at(-1).format, format.toLowerCase());
    assert.equal(ui.control("Exportar " + format).props.disabled, false);
  }
});
