export function withSessionLock<T>(action: () => Promise<T>, _refresh = false): Promise<T> {
  return action();
}

export function observeStoredSession(_listener: () => void) {
  return () => {};
}
