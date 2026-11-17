import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export function Screen({ children }: PropsWithChildren) {
  const theme = useTheme();
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={["bottom", "left", "right"]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  content: {
    padding: 24,
    gap: 18,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
});
