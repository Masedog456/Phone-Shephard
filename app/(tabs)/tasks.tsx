import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Plus } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { TaskCard } from "@/components/TaskCard";
import { useShepherdTasks } from "@/features/tasks/useShepherdTasks";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export default function TasksScreen() {
  const tasks = useShepherdTasks((state) => state.tasks);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>Shepherds</Text>
          <Text style={styles.title}>Choose where you would like Shepherd's help.</Text>
          <Text style={styles.subtitle}>Each shepherd is a calm ritual for rediscovering, keeping, or releasing what you saved.</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => router.push("/tasks/create")}>
          <Plus color={colors.cream} size={22} />
        </Pressable>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <TaskCard task={item} onPress={() => router.push(`/tasks/${item.id}`)} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.xl
  },
  headerCopy: {
    flex: 1,
    gap: spacing.sm
  },
  kicker: {
    ...typography.label,
    color: colors.sage
  },
  title: {
    ...typography.title,
    color: colors.ink
  },
  subtitle: {
    ...typography.body,
    color: colors.subtle
  },
  addButton: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft
  },
  list: {
    gap: spacing.lg,
    paddingBottom: 120
  }
});
