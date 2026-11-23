import { useEffect, useRef } from "react";
import { WebView } from "react-native-webview";
import { asHtml, type EditorProps } from "./editor-content";
import {
  editorBridge,
  nextEditorContent,
  type EditorSyncState,
} from "./editor-bridge";
const encoded = (value: unknown) =>
  JSON.stringify(value).replaceAll("<", "\\u003c");
export function RichTextEditor(props: EditorProps) {
  const ref = useRef<WebView<object>>(null);
  const ready = useRef(false);
  const sync = useRef<EditorSyncState>({ applied: null, echoes: [] });
  const revision = useRef(0);
  const propsRef = useRef(props);
  propsRef.current = props;
  const update = (presentation = false) => {
    const p = propsRef.current;
    const content = nextEditorContent(sync.current, p.value);
    const html = content === null ? null : asHtml(content);
    if (html === null && !presentation) return;
    const style = presentation
      ? {
          color: p.color,
          backgroundColor: p.background,
          fontSize: p.fontSize + "px",
          lineHeight: p.lineHeight + "px",
          fontFamily: p.fontFamily ?? "serif",
          textIndent: p.indent ? "1.5em" : "0",
        }
      : null;
    ref.current?.injectJavaScript(
      "window.setEditor(" +
        encoded(html) +
        "," +
        encoded(style) +
        "," +
        !p.disabled +
        "," +
        revision.current +
        ");true;",
    );
  };
  useEffect(() => {
    if (ready.current) update();
  }, [props.value]);
  useEffect(() => {
    if (ready.current) update(true);
  }, [
    props.disabled,
    props.color,
    props.background,
    props.fontSize,
    props.lineHeight,
    props.fontFamily,
    props.indent,
  ]);
  const source = useRef({
    html: `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-editor'; style-src 'unsafe-inline'; img-src 'none'"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"><style>body{margin:0;padding:12px;overflow-wrap:anywhere}#editor{min-height:350px;outline:none;white-space:pre-wrap}p{margin:0 0 .5em}</style></head><body><div id="editor" role="textbox" aria-label="Texto da história" contenteditable="true"></div><script nonce="editor">${editorBridge}</script></body></html>`,
  });
  return (
    <WebView<object>
      ref={ref}
      source={source.current}
      originWhitelist={["about:blank"]}
      onShouldStartLoadWithRequest={(req) => req.url === "about:blank"}
      onLoadEnd={() => {
        ready.current = true;
        sync.current = { applied: null, echoes: [] };
        revision.current = 0;
        update(true);
      }}
      onMessage={(event) => {
        let message: { html?: unknown; revision?: unknown };
        try {
          message = JSON.parse(event.nativeEvent.data);
        } catch {
          return;
        }
        if (
          typeof message.html !== "string" ||
          typeof message.revision !== "number" ||
          !Number.isSafeInteger(message.revision) ||
          message.revision <= revision.current
        )
          return;
        revision.current = message.revision;
        sync.current.echoes.push(message.html);
        propsRef.current.onChange(message.html);
      }}
      style={{ height: 430, backgroundColor: props.background }}
      scrollEnabled
      keyboardDisplayRequiresUserAction={false}
    />
  );
}
