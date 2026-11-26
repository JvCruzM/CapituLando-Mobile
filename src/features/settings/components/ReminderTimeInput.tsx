import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Dialog, Portal, useTheme } from "react-native-paper";
import { Button, TextInput } from "../../../shared/components/Controls";

interface Props {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

function toDate(value: string) {
  const date = new Date();
  const [hour, minute] = /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
    ? value.split(":").map(Number)
    : [20, 0];
  date.setHours(hour!, minute!, 0, 0);
  return date;
}

function toTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function ReminderTimeInput({ value, disabled, onChange }: Props) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState(() => toDate(value));

  function open() {
    if (disabled) return;
    const date = toDate(value);
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: date,
        mode: "time",
        display: "clock",
        is24Hour: true,
        positiveButton: { label: "Confirmar" },
        negativeButton: { label: "Cancelar" },
        onValueChange: (_event, next) => onChange(toTime(next)),
      });
    } else {
      setSelected(date);
      setVisible(true);
    }
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Horário do lembrete: ${value}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={open}
      >
        <View pointerEvents="none" accessible={false}>
          <TextInput
            mode="outlined"
            label="Horário do lembrete"
            value={value}
            editable={false}
            disabled={disabled}
            right={<TextInput.Icon icon="clock-outline" />}
          />
        </View>
      </Pressable>
      {Platform.OS === "ios" && visible ? (
        <Portal>
          <Dialog visible onDismiss={() => setVisible(false)}>
            <Dialog.Title>Horário do lembrete</Dialog.Title>
            <Dialog.Content>
              <DateTimePicker
                value={selected}
                mode="time"
                display="spinner"
                locale="pt-BR"
                themeVariant={theme.dark ? "dark" : "light"}
                onValueChange={(_event, next) => setSelected(next)}
              />
            </Dialog.Content>
            <Dialog.Actions style={{ flexWrap: "wrap", gap: 8 }}>
              <Button onPress={() => setVisible(false)}>Cancelar</Button>
              <Button
                onPress={() => {
                  onChange(toTime(selected));
                  setVisible(false);
                }}
              >
                Confirmar
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      ) : null}
    </>
  );
}
