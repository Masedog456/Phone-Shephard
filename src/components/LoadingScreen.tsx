import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/lib/theme";

export function LoadingScreen() {
  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.sage} />
      <Text style={styles.text}>Gathering your library gently...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.cream
  },
  text: {
    ...typography.bodySmall,
    color: colors.subtle
  }
});
