import { asHtml, plainText } from "./components/editor-content";
export const fileName = (title: string) =>
  title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase() || "capitulo";
const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
export const writingText = (title: string, content: string) =>
  (title.trim() || "Sem Título") + "\n\n" + plainText(content);
export function writingHtml(
  title: string,
  content: string,
  storyTitle?: string,
) {
  const allowed = new Set([
    "p",
    "br",
    "div",
    "b",
    "strong",
    "i",
    "em",
    "u",
    "s",
    "strike",
    "ul",
    "ol",
    "li",
    "blockquote",
    "h1",
    "h2",
    "h3",
    "h4",
    "pre",
    "code",
  ]);
  const body = asHtml(content)
    .replace(
      /<(script|style|iframe|object|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
      "",
    )
    .replace(/<\/?([a-z][\w:-]*)\b[^>]*>/gi, (tag, name: string) =>
      allowed.has(name.toLowerCase())
        ? "<" + (tag.startsWith("</") ? "/" : "") + name.toLowerCase() + ">"
        : "",
    );
  return (
    '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'"><title>' +
    escape(title) +
    "</title><style>body{font-family:Georgia,serif;padding:36px;color:#1c1917;line-height:1.7}h1{color:#4b1d3f}p{margin:0 0 12px}blockquote{border-left:3px solid #9d174d;padding-left:14px}pre{white-space:pre-wrap}@page{margin:20mm}</style></head><body>" +
    (storyTitle ? "<p>" + escape(storyTitle) + "</p>" : "") +
    "<h1>" +
    escape(title.trim() || "Sem Título") +
    "</h1>" +
    body +
    "</body></html>"
  );
}
