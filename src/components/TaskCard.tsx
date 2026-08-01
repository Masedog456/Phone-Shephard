import { Pressable, StyleSheet, Text, View } from "react-native";
import { Archive, Bell, BookMarked, FileText, FolderHeart, Heart, Sparkles, Trash2 } from "lucide-react-native";
import { ShepherdTask, ShepherdTaskAction } from "@/types/domain";
import { sourceLabels } from "@/features/tasks/mockTasks";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

const actionLabels: Record<ShepherdTaskAction, string> = {
  review: "Review",
  delete: "Let go",
  archive: "Keep safe",
  save: "Save",
  categorize: "Categorize",
  summarize: "Summarize",
  remind_later: "Remind later"
};

export function TaskCard({ task, onPress }: { task: ShepherdTask; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.topRow}>
        <View style={styles.icon}>{iconForAction(task.action)}</View>
        <View style={styles.copy}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{task.name}</Text>
            {task.status === "coming_soon" && <Text style={styles.badge}>Coming Soon</Text>}
            {!task.isDefault && <Text style={styles.badge}>Custom</Text>}
          </View>
          <Text style={styles.body}>{task.description}</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{sourceLabels[task.source]}</Text>
        <Text style={styles.dot}>.</Text>
        <Text style={styles.meta}>{actionLabels[task.action]}</Text>
        <Text style={styles.dot}>.</Text>
        <Text style={styles.meta}>{task.resultCount} waiting</Text>
      </View>
    </Pressable>
  );
}

function iconForAction(action: ShepherdTaskAction) {
  const props = { color: colors.ink, size: 20 };
  switch (action) {
    case "delete":
      return <Trash2 {...props} />;
    case "archive":
      return <Archive {...props} />;
    case "save":
      return <FolderHeart {...props} />;
    case "categorize":
      return <BookMarked {...props} />;
    case "summarize":
      return <FileText {...props} />;
    case "remind_later":
      return <Bell {...props} />;
    default:
      return <Heart {...props} />;
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.quiet
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }]
  },
  topRow: {
    flexDirection: "row",
    gap: spacing.md
  },
  icon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  nameRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm
  },
  name: {
    ...typography.cardTitle,
    color: colors.ink
  },
  badge: {
    ...typography.bodySmall,
    color: colors.blue,
    backgroundColor: colors.mist,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2
  },
  body: {
    ...typography.bodySmall,
    color: colors.subtle
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.cardSoft,
    borderRadius: radii.pill,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  meta: {
    ...typography.bodySmall,
    color: colors.sage
  },
  dot: {
    ...typography.bodySmall,
    color: colors.muted
  }
});
