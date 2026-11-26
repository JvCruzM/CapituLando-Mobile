import { Tabs } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTheme } from "react-native-paper";
export const unstable_settings = { anchor: "painel" };
export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      backBehavior="initialRoute"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
          height: 68,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      {(
        [
          ["painel", "Painel", "view-dashboard-outline"],
          ["historias", "Livros", "book-open-page-variant-outline"],
          ["enciclopedia", "Universo", "earth"],
          ["conta", "Conta", "account-circle-outline"],
        ] as const
      ).map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name={icon}
                color={typeof color === "string" ? color : theme.colors.primary}
                size={size}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
