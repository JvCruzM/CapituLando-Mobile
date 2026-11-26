import { NativeTabs } from "expo-router/native-tabs";
import { useTheme } from "react-native-paper";
export const unstable_settings = { anchor: "painel" };
export default function TabsLayout() {
  const theme = useTheme();
  return (
    <NativeTabs
      backBehavior="initialRoute"
      backgroundColor={theme.colors.surface}
      tintColor={theme.colors.primary}
      indicatorColor={theme.colors.primaryContainer}
      iconColor={{
        default: theme.colors.onSurfaceVariant,
        selected: theme.colors.primary,
      }}
      labelStyle={{
        default: { color: theme.colors.onSurfaceVariant },
        selected: { color: theme.colors.primary, fontWeight: "600" },
      }}
      labelVisibilityMode="labeled"
      disableTransparentOnScrollEdge
    >
      <NativeTabs.Trigger
        name="painel"
        contentStyle={{ backgroundColor: theme.colors.background }}
      >
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          md="home"
        />
        <NativeTabs.Trigger.Label>Painel</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="historias"
        contentStyle={{ backgroundColor: theme.colors.background }}
      >
        <NativeTabs.Trigger.Icon
          sf={{ default: "books.vertical", selected: "books.vertical.fill" }}
          md="menu_book"
        />
        <NativeTabs.Trigger.Label>Livros</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="enciclopedia"
        contentStyle={{ backgroundColor: theme.colors.background }}
      >
        <NativeTabs.Trigger.Icon
          sf={{ default: "globe", selected: "globe" }}
          md="public"
        />
        <NativeTabs.Trigger.Label>Universo</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="conta"
        contentStyle={{ backgroundColor: theme.colors.background }}
      >
        <NativeTabs.Trigger.Icon
          sf={{
            default: "person.crop.circle",
            selected: "person.crop.circle.fill",
          }}
          md="account_circle"
        />
        <NativeTabs.Trigger.Label>Conta</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
