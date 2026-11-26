import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export function Screen({ children }: PropsWithChildren) {
  const theme = useTheme();
  return (
    <SafeAreaView
      collapsable={false}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={["bottom", "left", "right"]}
    >
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.content}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 18,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
});
