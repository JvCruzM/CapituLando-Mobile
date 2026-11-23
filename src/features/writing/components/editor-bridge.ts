export interface EditorSyncState {
  applied: string | null;
  echoes: string[];
}

export function nextEditorContent(state: EditorSyncState, value: string) {
  const index = state.echoes.indexOf(value);
  const echo = index >= 0;
  if (echo) state.echoes.splice(0, index + 1);
  const changed = value !== state.applied;
  state.applied = value;
  return !echo && changed ? value : null;
}

export const editorBridge = `
const editor = document.getElementById('editor');
let revision = 0;
window.setEditor = (html, style, enabled, expectedRevision) => {
  if (html !== null && revision === expectedRevision && editor.innerHTML !== html) {
    editor.innerHTML = html;
  }
  if (style !== null) {
    Object.assign(editor.style, style);
    document.body.style.backgroundColor = style.backgroundColor;
  }
  if (editor.isContentEditable !== enabled) editor.contentEditable = String(enabled);
};
editor.addEventListener('input', () => {
  revision += 1;
  window.ReactNativeWebView.postMessage(JSON.stringify({html: editor.innerHTML, revision}));
});
`;
