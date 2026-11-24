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
let savedRange = null;
document.addEventListener?.('selectionchange', () => {
  const selection = window.getSelection();
  if (selection?.rangeCount && editor.contains(selection.anchorNode)) savedRange = selection.getRangeAt(0).cloneRange();
});
window.formatEditor = (action) => {
  if (!editor.isContentEditable) return;
  const commands = {bold:['bold'], italic:['italic'], underline:['underline'], heading:['formatBlock','h2'], quote:['formatBlock','blockquote'], list:['insertUnorderedList']};
  const command = commands[action]; if (!command) return;
  editor.focus();
  if (savedRange && editor.contains(savedRange.commonAncestorContainer)) {
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(savedRange);
  }
  document.execCommand(command[0], false, command[1]);
  editor.dispatchEvent(new Event('input', {bubbles:true}));
};
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
