import { prepareEditorBlocks } from "./editor-formatting";
import { createElement, useEffect, useRef } from "react";
import { asHtml, type EditorProps } from "./editor-content";
function clean(value: string) {
  const doc = new DOMParser().parseFromString(asHtml(value), "text/html");
  const allowed = new Set([
    "P",
    "BR",
    "DIV",
    "B",
    "STRONG",
    "I",
    "EM",
    "U",
    "S",
    "STRIKE",
    "UL",
    "OL",
    "LI",
    "BLOCKQUOTE",
    "H1",
    "H2",
    "H3",
    "H4",
    "PRE",
    "CODE",
  ]);
  for (const el of [...doc.body.querySelectorAll("*")]) {
    if (
      [
        "SCRIPT",
        "STYLE",
        "IFRAME",
        "OBJECT",
        "SVG",
        "MATH",
        "IMG",
        "LINK",
      ].includes(el.tagName)
    ) {
      el.remove();
      continue;
    }
    for (const attr of [...el.attributes]) el.removeAttribute(attr.name);
    if (!allowed.has(el.tagName)) el.replaceWith(...el.childNodes);
  }
  prepareEditorBlocks(doc.body);
  return doc.body.innerHTML;
}
export function RichTextEditor({
  command,
  value,
  onChange,
  disabled,
  color,
  background,
  fontSize,
  lineHeight,
  fontFamily,
  indent,
}: EditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const latest = useRef(value);
  const savedRange = useRef<Range | null>(null);
  useEffect(() => {
    const remember = () => {
      const selection = window.getSelection();
      if (selection?.rangeCount && ref.current?.contains(selection.anchorNode))
        savedRange.current = selection.getRangeAt(0).cloneRange();
    };
    document.addEventListener("selectionchange", remember);
    return () => document.removeEventListener("selectionchange", remember);
  }, []);
  useEffect(() => {
    if (!command || disabled || !ref.current) return;
    const editor = ref.current;
    editor.focus();
    const range = savedRange.current;
    if (range && editor.contains(range.commonAncestorContainer)) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    const commands = {
      bold: ["bold"],
      italic: ["italic"],
      underline: ["underline"],
      h1: ["formatBlock", "h1"],
      h2: ["formatBlock", "h2"],
      quote: ["formatBlock", "blockquote"],
      list: ["insertUnorderedList"],
    };
    const args = commands[command.action];
    prepareEditorBlocks(editor);
    document.execCommand(args[0]!, false, args[1]);
    prepareEditorBlocks(editor);
    const selection = window.getSelection();
    if (selection?.rangeCount && editor.contains(selection.anchorNode))
      savedRange.current = selection.getRangeAt(0).cloneRange();
    latest.current = editor.innerHTML;
    onChange(editor.innerHTML);
  }, [command?.id]);
  useEffect(() => {
    if (ref.current && value !== latest.current) {
      ref.current.innerHTML = clean(value);
      latest.current = value;
    }
  }, [value]);
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = clean(value);
  }, []);
  return createElement("div", {
    ref,
    contentEditable: !disabled,
    suppressContentEditableWarning: true,
    role: "textbox",
    "aria-label": "Texto da história",
    "aria-multiline": true,
    "aria-disabled": disabled,
    onPaste: (event: React.ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();
      document.execCommand(
        "insertHTML",
        false,
        clean(
          event.clipboardData.getData("text/html") ||
            event.clipboardData.getData("text/plain"),
        ),
      );
    },
    onInput: (event: React.FormEvent<HTMLDivElement>) => {
      prepareEditorBlocks(event.currentTarget);
      const html = event.currentTarget.innerHTML;
      latest.current = html;
      onChange(html);
    },
    style: {
      minHeight: 360,
      padding: 12,
      color,
      background,
      fontSize,
      lineHeight: `${lineHeight}px`,
      fontFamily,
      textIndent: indent ? "1.5em" : 0,
      outline: "none",
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
      opacity: disabled ? 0.6 : 1,
    },
  });
}
