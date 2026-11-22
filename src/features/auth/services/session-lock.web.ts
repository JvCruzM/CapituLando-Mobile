export function withSessionLock<T>(action: () => Promise<T>, refresh = false): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks)
    return navigator.locks.request("capitulando.auth.session", action);
  if (refresh) return Promise.reject(new Error(
    "Para renovar a sessão no navegador, use localhost ou HTTPS. Você também pode entrar novamente ou usar o aplicativo no celular.",
  ));
  return action();
}

export function observeStoredSession(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === "capitulando.auth.session" || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
