import type { FormattingAction } from "../types";
export interface EditorProps {
  command?: { id: number; action: FormattingAction };
  value: string;
  onChange: (html: string) => void;
  disabled: boolean;
  color: string;
  background: string;
  fontSize: number;
  lineHeight: number;
  fontFamily?: string;
  indent: boolean;
}
export function asHtml(value: string) {
  if (/<\/?[a-z][^>]*>/i.test(value)) return value;
  return value
    .replace(/&(?!(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-f]+);)/gi, "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\n", "<br>");
}
export function plainText(value: string) {
  return value
    .replace(/<\/(p|div|h[1-6]|li)>|<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}
