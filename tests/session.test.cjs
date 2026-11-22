const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const axios = require("axios");

function load(file, mocks) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", code)(
    (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      return require(name);
    },
    module,
    module.exports,
  );
  return module.exports;
}
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const session = (
  id = "one",
  token = "initial",
  expiresAt = Date.now() + 900000,
) => ({
  sessionId: id,
  accessToken: token,
  refreshToken: "refresh-" + token.repeat(20),
  expiresAt,
  user: { id: "owner-" + id, displayName: "Autora" },
});
const httpError = (status) =>
  Object.assign(new Error("HTTP " + status), {
    isAxiosError: true,
    response: { status },
  });

function environment(options = {}) {
  const values = new Map();
  const storage = load("src/shared/storage/secure-store.ts", {
    "expo-secure-store": {
      isAvailableAsync: async () => true,
      getItemAsync: async (key) => values.get(key) ?? null,
      setItemAsync: async (key, value) => {
        if (options.beforeWrite) await options.beforeWrite(key, value);
        values.set(key, value);
      },
      deleteItemAsync: async (key) => {
        values.delete(key);
      },
    },
    "react-native": { Platform: { OS: "android" } },
  });
  const api = load("src/features/auth/services/auth-api.ts", {
    "../../../shared/api/http": { transport: {} },
  });
  const renewed = [],
    revoked = [];
  const auth = load("src/features/auth/session.ts", {
    "../../shared/api/query-client": { queryClient: { clear() {} } },
    "../../shared/storage/secure-store": storage,
    "./services/auth-api": {
      ...api,
      renewSession: async (current) => {
        renewed.push(current);
        return options.renew
          ? options.renew(current)
          : {
              ...current,
              ...session(current.sessionId, "renewed"),
              user: current.user,
            };
      },
      revokeSession: async (current) => {
        revoked.push(current);
        if (options.revoke) await options.revoke(current);
      },
    },
    "./services/session-lock": {
      withSessionLock: (action, refresh) =>
        options.lock ? options.lock(action, refresh) : action(),
    },
  });
  const account = load("src/shared/api/account.ts", {
    "./http": { transport: { request: (config) => options.request(config) } },
    "../../features/auth/session": auth,
  });
  return { ...auth, ...storage, account, values, renewed, revoked };
}

test("salvar e limpar em sequência não restaura uma sessão encerrada", async () => {
  const gate = deferred();
  const env = environment({ beforeWrite: () => gate.promise });
  const saving = env.saveAuthSession(session());
  const clearing = env.clearAuthSession();
  gate.resolve();
  await saving;
  await clearing;
  assert.equal(await env.getAuthSession(), null);
  assert.equal(env.values.size, 0);
});

test("login pendente seguido de limpeza mantém sessão e disco vazios", async () => {
  const gate = deferred(),
    started = deferred();
  const env = environment({
    beforeWrite: () => {
      started.resolve();
      return gate.promise;
    },
  });
  const login = env.useAuthStore.getState().setSession(session());
  await started.promise;
  const clearing = env.useAuthStore.getState().clearSession();
  gate.resolve();
  await assert.rejects(login, /sessão mudou/);
  await clearing;
  assert.equal(env.useAuthStore.getState().session, null);
  assert.equal(await env.getAuthSession(), null);
});

test("requisições simultâneas compartilham uma única renovação", async () => {
  const gate = deferred(),
    started = deferred();
  const env = environment({
    renew: async (old) => {
      started.resolve();
      await gate.promise;
      return { ...old, ...session(old.sessionId, "renewed") };
    },
  });
  await env.useAuthStore
    .getState()
    .setSession(session("one", "old", Date.now() - 1));
  const requests = Array.from({ length: 8 }, () => env.ensureAuthSession());
  await started.promise;
  assert.equal(env.renewed.length, 1);
  gate.resolve();
  const results = await Promise.all(requests);
  assert.ok(results.every((row) => row.accessToken === "renewed"));
  assert.equal((await env.getAuthSession()).accessToken, "renewed");
});

test("401 renova e repete uma vez; respostas atrasadas usam o token já renovado", async () => {
  const env = environment({
    request: async (config) => {
      if (config.headers.Authorization === "Bearer initial")
        throw httpError(401);
      assert.equal(config.headers.Authorization, "Bearer renewed");
      return { data: { saved: true } };
    },
  });
  await env.useAuthStore.getState().setSession(session());
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      env.account.accountRequest({ url: "/api/profile" }),
    ),
  );
  assert.ok(results.every((value) => value.saved));
  assert.equal(env.renewed.length, 1);
});

test("token revogado limpa sessão; indisponibilidade preserva credenciais para tentar depois", async () => {
  const revoked = environment({
    renew: async () => {
      throw httpError(401);
    },
  });
  await revoked.useAuthStore.getState().setSession(session("one", "old", 0));
  await assert.rejects(revoked.ensureAuthSession());
  assert.equal(revoked.useAuthStore.getState().session, null);
  assert.equal(await revoked.getAuthSession(), null);
  const offline = environment({
    renew: async () => {
      throw new Error("Sem conexão");
    },
  });
  await offline.useAuthStore.getState().setSession(session("one", "old", 0));
  await assert.rejects(offline.ensureAuthSession());
  assert.equal(offline.useAuthStore.getState().session.accessToken, "old");
  assert.equal((await offline.getAuthSession()).accessToken, "old");
});

test("logout aguarda renovação pendente e revoga as credenciais atuais", async () => {
  const gate = deferred(),
    started = deferred();
  const env = environment({
    renew: async (old) => {
      started.resolve();
      await gate.promise;
      return { ...old, ...session(old.sessionId, "renewed") };
    },
  });
  await env.useAuthStore.getState().setSession(session("one", "old", 0));
  const renewing = env.refreshAuthSession();
  await started.promise;
  const loggingOut = env.useAuthStore.getState().logout();
  gate.resolve();
  await renewing;
  assert.equal(await loggingOut, "");
  assert.equal(env.revoked.at(-1).accessToken, "renewed");
  assert.equal(env.useAuthStore.getState().session, null);
  assert.equal(await env.getAuthSession(), null);
});

test("resposta de renovação anterior não substitui uma nova conta", async () => {
  const gate = deferred(),
    started = deferred();
  const env = environment({
    renew: async (old) => {
      started.resolve();
      await gate.promise;
      return { ...old, ...session(old.sessionId, "late") };
    },
  });
  await env.useAuthStore.getState().setSession(session("one", "old", 0));
  const renewing = env.refreshAuthSession();
  await started.promise;
  await env.useAuthStore.getState().clearSession();
  await env.useAuthStore.getState().setSession(session("two", "new"));
  gate.resolve();
  await assert.rejects(renewing, /sessão mudou/);
  assert.equal(env.useAuthStore.getState().session.sessionId, "two");
  assert.equal((await env.getAuthSession()).sessionId, "two");
});

test("resposta de API da conta anterior é descartada mesmo ao entrar novamente na mesma conta", async () => {
  const gate = deferred();
  const env = environment({ request: () => gate.promise });
  await env.useAuthStore.getState().setSession(session());
  const request = env.account.accountRequest({ url: "/api/profile" });
  await Promise.resolve();
  await Promise.resolve();
  await env.useAuthStore.getState().clearSession();
  await env.useAuthStore.getState().setSession(session());
  gate.resolve({ data: { private: true } });
  await assert.rejects(request, /sessão mudou/);
});

test("reabertura recupera sessão expirada e renova antes de continuar", async () => {
  const env = environment();
  await env.saveAuthSession(session("one", "old", 0));
  await env.useAuthStore.getState().initialize();
  assert.equal(env.renewed.length, 1);
  assert.equal(env.useAuthStore.getState().session.accessToken, "renewed");
  assert.equal(env.useAuthStore.getState().isInitialized, true);
});

test("logout sem conexão remove credenciais locais e informa a falha de revogação", async () => {
  const env = environment({
    revoke: async () => {
      throw new Error("Offline");
    },
  });
  await env.useAuthStore.getState().setSession(session());
  assert.match(
    await env.useAuthStore.getState().logout(),
    /Não foi possível confirmar/,
  );
  assert.equal(env.useAuthStore.getState().session, null);
  assert.equal(await env.getAuthSession(), null);
});

test("seleção nativa de foto trata cancelamento, reduz a imagem e libera recursos", async () => {
  let canceled = true,
    renderedReleased = 0,
    contextReleased = 0;
  const photo = load("src/features/profile/services/profile-photo.ts", {
    "expo-image-picker": {
      launchImageLibraryAsync: async () => ({
        canceled,
        assets: [{ uri: "content://chosen/photo" }],
      }),
    },
    "expo-image-manipulator": {
      SaveFormat: { JPEG: "jpeg" },
      ImageManipulator: {
        manipulate(uri) {
          assert.equal(uri, "content://chosen/photo");
          return {
            resize: (options) => assert.deepEqual(options, { width: 512 }),
            renderAsync: async () => ({
              saveAsync: async (options) => {
                assert.equal(options.format, "jpeg");
                return { base64: "photo" };
              },
              release: () => {
                renderedReleased++;
              },
            }),
            release: () => {
              contextReleased++;
            },
          };
        },
      },
    },
  });
  assert.equal(await photo.chooseProfilePhoto(), null);
  assert.equal(contextReleased, 0);
  canceled = false;
  assert.equal(
    await photo.chooseProfilePhoto(),
    "data:image/jpeg;base64,photo",
  );
  assert.equal(renderedReleased, 1);
  assert.equal(contextReleased, 1);
});

test("renovação expõe carregamento e encerra o indicador após sucesso ou falha", async () => {
  const gate = deferred(),
    started = deferred();
  let fail = false;
  const env = environment({
    renew: async (current) => {
      started.resolve();
      await gate.promise;
      if (fail) throw httpError(503);
      return { ...current, ...session(current.sessionId, "renewed") };
    },
  });
  await env.useAuthStore.getState().setSession(session());
  const renewing = env.refreshAuthSession();
  await started.promise;
  assert.equal(env.useAuthStore.getState().isRefreshing, true);
  gate.resolve();
  await renewing;
  assert.equal(env.useAuthStore.getState().isRefreshing, false);
  fail = true;
  await assert.rejects(env.refreshAuthSession());
  assert.equal(env.useAuthStore.getState().isRefreshing, false);
  assert.ok(env.useAuthStore.getState().sessionError);
});

test("falha anterior à requisição também encerra o indicador e informa o erro", async () => {
  const env = environment({
    lock: (action, refresh) =>
      refresh
        ? Promise.reject(new Error("Renovação indisponível neste navegador"))
        : action(),
  });
  await env.useAuthStore.getState().setSession(session());
  await assert.rejects(env.refreshAuthSession());
  assert.equal(env.useAuthStore.getState().isRefreshing, false);
  assert.match(
    env.useAuthStore.getState().sessionError,
    /Renovação indisponível/,
  );
});
