import { Text, SegmentedButtons } from "react-native-paper";
import { Screen } from "../shared/components/Screen";
import { useUIStore } from "../shared/store/ui-store";

export default function AboutScreen() {
  const { themeMode, setThemeMode } = useUIStore();
  return (
    <Screen>
      <Text variant="headlineMedium">CapituLando Mobile</Text>
      <Text>
        Organização literária para escritores. O objetivo da migração é permitir
        no celular todas as ações disponíveis na versão web, compartilhando os
        mesmos dados.
      </Text>
      <Text variant="titleMedium">Aparência desta sessão</Text>
      <SegmentedButtons
        value={themeMode}
        onValueChange={(value) => setThemeMode(value as typeof themeMode)}
        buttons={[
          { value: "system", label: "Sistema" },
          { value: "light", label: "Claro" },
          { value: "dark", label: "Escuro" },
        ]}
      />
      <Text variant="titleMedium">Frontend</Text>
      <Text>João Vitor · Moniky · Jamilly · Nerisson · Marcio</Text>
      <Text variant="titleMedium">Backend</Text>
      <Text>João Vitor · Joao Marcos · Moniky · Jamilly · Marcio</Text>
    </Screen>
  );
}
