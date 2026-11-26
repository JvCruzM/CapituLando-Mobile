import { Stack } from "expo-router";
import { useTheme } from "react-native-paper";
import { useStackOptions } from "./useStackOptions";
export function TabStack({ title }: { title: string }) {
  const theme = useTheme();
  const options = useStackOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen
        name="index"
        options={{
          title,
          headerBackVisible: false,
          headerTintColor: theme.colors.primary,
        }}
      />
    </Stack>
  );
}
