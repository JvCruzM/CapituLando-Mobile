import {
  nextEditorContent,
  type EditorSyncState,
} from "../../writing/components/editor-bridge";
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type ComponentRef,
} from "react";
import { TextInput as NativeInput, type TextInputProps } from "react-native";
import { TextInput as PaperInput } from "../../../shared/components/Controls";
type InputInstance = ComponentRef<typeof NativeInput>;
const NativeFormInput = forwardRef<InputInstance, TextInputProps>(
  function NativeFormInput({ value, onChangeText, ...props }, forwardedRef) {
    const input = useRef<InputInstance | null>(null);
    const initialValue = useRef(value);
    const sync = useRef<EditorSyncState>({ applied: value ?? "", echoes: [] });
    const ref = useCallback(
      (node: InputInstance | null) => {
        input.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );
    useEffect(() => {
      const next = nextEditorContent(sync.current, value ?? "");
      if (next !== null) input.current?.setNativeProps({ text: next });
    }, [value]);
    return (
      <NativeInput
        {...props}
        ref={ref}
        defaultValue={initialValue.current}
        onChangeText={(text) => {
          sync.current.echoes.push(text);
          onChangeText?.(text);
        }}
      />
    );
  },
);
const renderInput: NonNullable<
  React.ComponentProps<typeof PaperInput>["render"]
> = ({ ref, ...props }) => (
  <NativeFormInput
    {...props}
    ref={ref as unknown as React.Ref<InputInstance>}
  />
);
export function StableFormInput(
  props: React.ComponentProps<typeof PaperInput>,
) {
  return <PaperInput {...props} render={renderInput} />;
}
