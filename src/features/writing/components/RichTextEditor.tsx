import { useEffect, useRef } from "react";
import { WebView } from "react-native-webview";
import { asHtml, type EditorProps } from "./editor-content";
const encoded = (value: unknown) =>
  JSON.stringify(value).replaceAll("<", "\\u003c");
export function RichTextEditor(props: EditorProps) {
  const ref = useRef<WebView<object>>(null);
  const ready = useRef(false);
  const latest = useRef(props.value);
  const propsRef = useRef(props);
  propsRef.current = props;
  const update = () => {
    const p = propsRef.current;
    const js = `window.setEditor(${encoded(asHtml(p.value))},${encoded({ color: p.color, backgroundColor: p.background, fontSize: p.fontSize + "px", lineHeight: p.lineHeight + "px", fontFamily: p.fontFamily ?? "serif", textIndent: p.indent ? "1.5em" : "0" })},${!p.disabled});true;`;
    ref.current?.injectJavaScript(js);
  };
  useEffect(() => {
    if (ready.current) update();
  }, [
    props.value,
    props.disabled,
    props.color,
    props.background,
    props.fontSize,
    props.lineHeight,
    props.fontFamily,
    props.indent,
  ]);
  const source = useRef({
    html: `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-editor'; style-src 'unsafe-inline'; img-src 'none'"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"><style>body{margin:0;padding:12px;overflow-wrap:anywhere}#editor{min-height:350px;outline:none;white-space:pre-wrap}p{margin:0 0 .5em}</style></head><body><div id="editor" role="textbox" aria-label="Texto da história" contenteditable="true"></div><script nonce="editor">const editor=document.getElementById('editor');window.setEditor=(html,style,enabled)=>{if(editor.innerHTML!==html)editor.innerHTML=html;Object.assign(editor.style,style);document.body.style.backgroundColor=style.backgroundColor;editor.contentEditable=String(enabled);};editor.addEventListener('input',()=>window.ReactNativeWebView.postMessage(editor.innerHTML));</script></body></html>`,
  });
  return (
    <WebView<object>
      ref={ref}
      source={source.current}
      originWhitelist={["about:blank"]}
      onShouldStartLoadWithRequest={(req) => req.url === "about:blank"}
      onLoadEnd={() => {
        ready.current = true;
        update();
      }}
      onMessage={(event) => {
        latest.current = event.nativeEvent.data;
        propsRef.current.onChange(latest.current);
      }}
      style={{ height: 430, backgroundColor: props.background }}
      scrollEnabled
      keyboardDisplayRequiresUserAction={false}
    />
  );
}
