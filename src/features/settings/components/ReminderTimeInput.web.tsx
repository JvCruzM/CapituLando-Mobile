import { TextInput } from "../../../shared/components/Controls";

export function ReminderTimeInput({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <TextInput
      mode="outlined"
      label="Horário do lembrete"
      accessibilityLabel="Horário do lembrete"
      placeholder="20:00"
      value={value}
      disabled={disabled}
      onChangeText={onChange}
    />
  );
}
