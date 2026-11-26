import {
  forwardRef,
  useCallback,
  type ComponentProps,
  type ComponentRef,
} from "react";
import {
  Button as PaperButton,
  TextInput as PaperInput,
  Searchbar as PaperSearchbar,
  IconButton as PaperIconButton,
  SegmentedButtons as PaperSegments,
  useTheme,
} from "react-native-paper";

type ButtonProps = ComponentProps<typeof PaperButton>;
export const Button = forwardRef<ComponentRef<typeof PaperButton>, ButtonProps>(
  function Button(
    { mode, style, labelStyle, contentStyle, buttonColor, textColor, ...props },
    ref,
  ) {
    const theme = useTheme();
    const primary = mode === "contained";
    const danger = textColor === theme.colors.error;
    const background = danger
      ? theme.colors.errorContainer
      : primary
        ? theme.dark
          ? "#9d174d"
          : "#4b1d3f"
        : theme.dark
          ? "#302037"
          : "#efdee8";
    const foreground = danger
      ? theme.colors.onErrorContainer
      : primary
        ? "#ffffff"
        : theme.dark
          ? "#f5edf3"
          : "#4b1d3f";
    return (
      <PaperButton
        {...props}
        ref={ref}
        mode="outlined"
        buttonColor={buttonColor ?? background}
        textColor={textColor ?? foreground}
        style={[
          {
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: props.disabled
              ? theme.colors.surfaceDisabled
              : (buttonColor ?? background),
            borderWidth: 1,
            borderColor: danger
              ? theme.colors.error
              : primary
                ? background
                : theme.dark
                  ? "#68465e"
                  : "#d6bdcc",
          },
          style,
        ]}
        contentStyle={[{ minHeight: 44 }, contentStyle]}
        labelStyle={[
          {
            fontWeight: "700",
            letterSpacing: 0.1,
            marginHorizontal:
              props.icon || props.loading ? (props.compact ? 8 : 24) : 14,
            marginVertical: 10,
          },
          labelStyle,
        ]}
      />
    );
  },
);

const Input = forwardRef<
  ComponentRef<typeof PaperInput>,
  ComponentProps<typeof PaperInput>
>(function TextInput(
  { style, outlineStyle, contentStyle, mode: _mode, ...props },
  ref,
) {
  const theme = useTheme();
  const attachRef = useCallback(
    (node: ComponentRef<typeof PaperInput> | null) => {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  return (
    <PaperInput
      outlineColor={theme.dark ? "#68465e" : "#d6bdcc"}
      activeOutlineColor={theme.colors.primary}
      textColor={theme.colors.onSurface}
      placeholderTextColor={theme.colors.onSurfaceVariant}
      {...props}
      ref={attachRef}
      mode="outlined"
      style={[{ backgroundColor: theme.dark ? "#221a2b" : "#fffdf9" }, style]}
      outlineStyle={[{ borderRadius: 12 }, outlineStyle]}
      contentStyle={[{ minHeight: props.multiline ? 92 : 52 }, contentStyle]}
    />
  );
});
export const TextInput = Object.assign(Input, {
  Icon: PaperInput.Icon,
  Affix: PaperInput.Affix,
});

export const Searchbar = forwardRef<
  ComponentRef<typeof PaperSearchbar>,
  ComponentProps<typeof PaperSearchbar>
>(function Searchbar({ style, inputStyle, ...props }, ref) {
  const theme = useTheme();
  return (
    <PaperSearchbar
      iconColor={theme.colors.primary}
      placeholderTextColor={theme.colors.onSurfaceVariant}
      {...props}
      ref={ref}
      style={[
        {
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.dark ? "#68465e" : "#d6bdcc",
          backgroundColor: theme.dark ? "#221a2b" : "#fffdf9",
        },
        style,
      ]}
      inputStyle={[
        { minHeight: 52, color: theme.colors.onSurface },
        inputStyle,
      ]}
      elevation={0}
    />
  );
});
export const IconButton = forwardRef<
  ComponentRef<typeof PaperIconButton>,
  ComponentProps<typeof PaperIconButton>
>(function IconButton({ style, iconColor, containerColor, ...props }, ref) {
  const theme = useTheme();
  const danger = iconColor === theme.colors.error;
  return (
    <PaperIconButton
      {...props}
      ref={ref}
      mode="outlined"
      iconColor={iconColor ?? theme.colors.primary}
      containerColor={
        containerColor ??
        (danger
          ? theme.colors.errorContainer
          : theme.dark
            ? "#302037"
            : "#efdee8")
      }
      style={[
        {
          borderRadius: 12,
          borderWidth: 1,
          borderColor: danger
            ? theme.colors.error
            : theme.dark
              ? "#68465e"
              : "#d6bdcc",
        },
        style,
      ]}
    />
  );
});

export function SegmentedButtons(props: ComponentProps<typeof PaperSegments>) {
  const theme = useTheme();
  return (
    <PaperSegments
      {...props}
      style={[{ gap: 6 }, props.style]}
      buttons={props.buttons.map((button) => {
        const selected = Array.isArray(props.value)
          ? props.value.includes(button.value)
          : props.value === button.value;
        return {
          ...button,
          checkedColor: button.checkedColor ?? "#ffffff",
          uncheckedColor: button.uncheckedColor ?? theme.colors.onSurface,
          labelStyle: [
            { fontSize: theme.fonts.labelMedium.fontSize, fontWeight: "700" },
            button.labelStyle,
          ],
          style: [
            {
              minHeight: 44,
              borderRadius: 12,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              borderBottomLeftRadius: 12,
              borderBottomRightRadius: 12,
              borderStartWidth: 1,
              borderEndWidth: 1,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: theme.dark ? "#68465e" : "#d6bdcc",
              backgroundColor: button.disabled
                ? theme.colors.surfaceDisabled
                : selected
                  ? theme.dark
                    ? "#9d174d"
                    : "#4b1d3f"
                  : theme.dark
                    ? "#221a2b"
                    : "#fffdf9",
            },
            button.style,
          ],
        };
      })}
    />
  );
}
