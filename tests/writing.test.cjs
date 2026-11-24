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
