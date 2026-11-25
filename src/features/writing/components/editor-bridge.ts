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
// Keep aligned with editor-formatting.ts. Embed source literally: Hermes does not preserve function source.
const prepareEditorBlocks = function prepareEditorBlocks(editor) {
    const selection = editor.ownerDocument.defaultView?.getSelection();
    const anchor = selection?.anchorNode;
    const focus = selection?.focusNode;
    const anchorOffset = selection?.anchorOffset ?? 0;
    const focusOffset = selection?.focusOffset ?? 0;
    let changed = false;
    const blocks = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "BLOCKQUOTE", "PRE"]);
    // Bare LI text makes formatBlock wrap the whole list in a heading in Chromium.
    // A paragraph gives the browser a real block to replace inside each list item.
    editor.querySelectorAll("li").forEach(item => {
        let paragraph = null;
        Array.from(item.childNodes).forEach(node => {
            if (node.nodeType === 1 && blocks.has(node.tagName)) {
                paragraph = null;
            }
            else {
                if (!paragraph) {
                    paragraph = editor.ownerDocument.createElement("p");
                    item.insertBefore(paragraph, node);
                    changed = true;
                }
                paragraph.appendChild(node);
            }
        });
    });
    // Repair invalid wrappers left by older formatting commands, preserving text,
    // nested lists and the innermost heading level instead of multiplying sizes.
    Array.from(editor.querySelectorAll("h1,h2")).reverse().forEach(heading => {
        if (!heading.querySelector("h1,h2,ul,ol"))
            return;
        heading.querySelectorAll("li").forEach(item => {
            Array.from(item.children).forEach(block => {
                if (!['P', 'DIV'].includes(block.tagName) || block.querySelector("h1,h2,ul,ol"))
                    return;
                const replacement = editor.ownerDocument.createElement(heading.tagName.toLowerCase());
                while (block.firstChild)
                    replacement.appendChild(block.firstChild);
                block.replaceWith(replacement);
            });
        });
        const parent = heading.parentNode;
        if (!parent)
            return;
        while (heading.firstChild)
            parent.insertBefore(heading.firstChild, heading);
        heading.remove();
        changed = true;
    });
    // Moving nodes invalidates live Ranges; restore the actual text endpoints.
    if (changed && selection && anchor && focus && editor.contains(anchor) && editor.contains(focus)) {
        const length = (node) => node.nodeType === 3 ? node.textContent?.length ?? 0 : node.childNodes.length;
        selection.setBaseAndExtent(anchor, Math.min(anchorOffset, length(anchor)), focus, Math.min(focusOffset, length(focus)));
    }
};
const editor = document.getElementById('editor');
let revision = 0;
let savedRange = null;
document.addEventListener?.('selectionchange', () => {
  const selection = window.getSelection();
  if (selection?.rangeCount && editor.contains(selection.anchorNode)) savedRange = selection.getRangeAt(0).cloneRange();
});
window.formatEditor = (action) => {
  if (!editor.isContentEditable) return;
  const commands = {bold:['bold'], italic:['italic'], underline:['underline'], h1:['formatBlock','h1'], h2:['formatBlock','h2'], quote:['formatBlock','blockquote'], list:['insertUnorderedList']};
  const command = commands[action]; if (!command) return;
  editor.focus();
  if (savedRange && editor.contains(savedRange.commonAncestorContainer)) {
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(savedRange);
  }
  prepareEditorBlocks(editor);
  document.execCommand(command[0], false, command[1]);
  prepareEditorBlocks(editor);
  const currentSelection = window.getSelection?.();
  if (currentSelection?.rangeCount && editor.contains(currentSelection.anchorNode)) savedRange = currentSelection.getRangeAt(0).cloneRange();
  editor.dispatchEvent(new Event('input', {bubbles:true}));
};
window.setEditor = (html, style, enabled, expectedRevision) => {
  if (html !== null && revision === expectedRevision && editor.innerHTML !== html) {
    editor.innerHTML = html;
    prepareEditorBlocks(editor);
  }
  if (style !== null) {
    Object.assign(editor.style, style);
    document.body.style.backgroundColor = style.backgroundColor;
  }
  if (editor.isContentEditable !== enabled) editor.contentEditable = String(enabled);
};
editor.addEventListener('input', () => {
  prepareEditorBlocks(editor);
  revision += 1;
  window.ReactNativeWebView.postMessage(JSON.stringify({html: editor.innerHTML, revision}));
});
`;
