import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Bell, Pencil, Play, Trash2 } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { sourceLabels } from "@/features/tasks/mockTasks";
import { useShepherdTasks } from "@/features/tasks/useShepherdTasks";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useShepherdTasks((state) => state.tasks.find((candidate) => candidate.id === id));
  const runTask = useShepherdTasks((state) => state.runTask);
  const deleteTask = useShepherdTasks((state) => state.deleteTask);

  if (!task) {
    return (
      <Screen>
        <Text style={styles.title}>This Shepherd is not here anymore.</Text>
      </Screen>
    );
  }

  const currentTask = task;

  function handleRun() {
    runTask(currentTask.id);
    router.push(`/tasks/${currentTask.id}/results`);
  }

  function handleDelete() {
    Alert.alert("Retire this Shepherd?", "This removes the ritual and its saved preview from this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          deleteTask(currentTask.id);
          router.replace("/tasks");
        }
      }
    ]);
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.kicker}>{sourceLabels[currentTask.source]}</Text>
        <Text style={styles.title}>{currentTask.name}</Text>
        <Text style={styles.subtitle}>{currentTask.description}</Text>
      </View>

      {currentTask.status === "coming_soon" && (
        <View style={styles.notice}>
          <Bell color={colors.blue} size={20} />
          <Text style={styles.noticeText}>This connection is coming soon. You can still preview how Shepherd will guide the review.</Text>
        </View>
      )}

      <View style={styles.panel}>
        <Text style={styles.panelLabel}>What Shepherd listens for</Text>
        <Text style={styles.panelText}>{currentTask.aiInstruction}</Text>
      </View>

      <View style={styles.metaGrid}>
        <Meta label="Care style" value={currentTask.action.replace("_", " ")} />
        <Meta label="Rhythm" value={currentTask.cadence ?? "manual"} />
        <Meta label="Last cared for" value={currentTask.lastRunAt ? "Recently" : "Not yet"} />
      </View>

      <Pressable style={styles.runButton} onPress={handleRun}>
        <Play color={colors.cream} size={20} />
        <Text style={styles.runText}>Begin this ritual</Text>
      </Pressable>

      <View style={styles.secondaryRow}>
        <Pressable style={styles.secondaryButton} onPress={() => router.push(`/tasks/create?id=${currentTask.id}`)}>
          <Pencil color={colors.ink} size={18} />
          <Text style={styles.secondaryText}>Tune</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={handleDelete}>
          <Trash2 color={colors.warning} size={18} />
          <Text style={[styles.secondaryText, styles.deleteText]}>Retire</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaValue}>{value}</Text>
      <Text style={styles.metaLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md
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
  notice: {
    marginTop: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.mist,
    padding: spacing.lg,
    flexDirection: "row",
    gap: spacing.md,
    ...shadows.quiet
  },
  noticeText: {
    ...typography.bodySmall,
    color: colors.ink,
    flex: 1
  },
  panel: {
    marginTop: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.quiet
  },
  panelLabel: {
    ...typography.label,
    color: colors.sage
  },
  panelText: {
    ...typography.body,
    color: colors.ink
  },
  metaGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xl
  },
  meta: {
    flex: 1,
    minHeight: 86,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.md,
    justifyContent: "space-between",
    ...shadows.quiet
  },
  metaValue: {
    ...typography.button,
    color: colors.ink,
    textTransform: "capitalize"
  },
  metaLabel: {
    ...typography.bodySmall,
    color: colors.subtle
  },
  runButton: {
    height: 56,
    borderRadius: radii.xl,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xl,
    ...shadows.soft
  },
  runText: {
    ...typography.button,
    color: colors.cream
  },
  secondaryRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md
  },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    ...shadows.quiet
  },
  secondaryText: {
    ...typography.button,
    color: colors.ink
  },
  deleteText: {
    color: colors.warning
  }
});
