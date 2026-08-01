import { useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { TaskResultCard } from "@/components/TaskResultCard";
import { TransformationResultView } from "@/components/TransformationResultView";
import { useShepherdTasks } from "@/features/tasks/useShepherdTasks";
import { transformationForTask, transformationResults } from "@/features/transformation/mockTransformations";
import { colors, spacing, typography } from "@/lib/theme";

export default function TaskResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useShepherdTasks((state) => state.tasks.find((candidate) => candidate.id === id));
  const results = useShepherdTasks((state) => state.resultsByTaskId[id] ?? []);
  const transformation = transformationResults[transformationForTask(task?.id)];

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Shepherd Findings</Text>
        <Text style={styles.title}>{task?.name ?? "Shepherd findings"}</Text>
        <Text style={styles.subtitle}>Move slowly. Every suggestion waits for your approval before anything is kept safe, released, saved, or brought back later.</Text>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.transformation}>
            <TransformationResultView result={transformation} />
            <Text style={styles.findingsTitle}>The findings behind this</Text>
            <Text style={styles.findingsBody}>You can still review every source item Shepherd used.</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="This care plan is waiting for its first story."
            body="Begin the ritual when you are ready, and Shepherd will turn what it finds into gentle suggestions."
            examples={["Saved links", "Useful notes", "Receipts", "Ideas"]}
          />
        }
        renderItem={({ item }) => <TaskResultCard result={item} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
    marginBottom: spacing.lg
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
  list: {
    gap: spacing.lg,
    paddingBottom: 120
  },
  transformation: {
    marginBottom: spacing.xl
  },
  findingsTitle: {
    ...typography.cardTitle,
    color: colors.ink,
    marginTop: spacing.xl
  },
  findingsBody: {
    ...typography.bodySmall,
    color: colors.subtle,
    marginTop: spacing.xs
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center"
  }
});
