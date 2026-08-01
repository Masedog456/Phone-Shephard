import { Pressable, StyleSheet, Text, View } from "react-native";
import { BookOpen, CheckCircle2, FileText, Globe, Images, Sparkles } from "lucide-react-native";
import { ShepherdRecommendation } from "@/features/session/shepherdSession";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

const accentColors: Record<ShepherdRecommendation["accent"], string> = {
  sage: colors.sage,
  blue: colors.blue,
  clay: colors.clay,
  lavender: "#8580A9"
};

export function SessionRecommendationCard({
  recommendation,
  selected,
  completed,
  onPress
}: {
  recommendation: ShepherdRecommendation;
  selected?: boolean;
  completed?: boolean;
  onPress: () => void;
}) {
  const accent = accentColors[recommendation.accent];

  return (
    <Pressable style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: `${accent}22` }]}>{iconForSource(recommendation.source, accent)}</View>
        <View style={styles.copy}>
          <Text style={[styles.source, { color: accent }]}>{sourceLabel(recommendation.source)}</Text>
          <Text style={styles.title}>{recommendation.title}</Text>
        </View>
        {completed ? <CheckCircle2 color={colors.sage} size={22} /> : <Text style={styles.time}>{recommendation.timeEstimate}</Text>}
      </View>
      <Text style={styles.message}>{recommendation.message}</Text>
      <View style={styles.actionPill}>
        <Sparkles color={accent} size={15} />
        <Text style={[styles.actionText, { color: accent }]}>{recommendation.gentleAction}</Text>
      </View>
    </Pressable>
  );
}

function iconForSource(source: ShepherdRecommendation["source"], color: string) {
  const props = { color, size: 21 };
  switch (source) {
    case "screenshots":
      return <Images {...props} />;
    case "notes":
      return <BookOpen {...props} />;
    case "tabs":
      return <Globe {...props} />;
    case "saved_posts":
      return <FileText {...props} />;
    default:
      return <Sparkles {...props} />;
  }
}

function sourceLabel(source: ShepherdRecommendation["source"]) {
  switch (source) {
    case "saved_posts":
      return "Saved Posts";
    default:
      return source.charAt(0).toUpperCase() + source.slice(1);
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
  selected: {
    backgroundColor: colors.cardSoft
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }]
  },
  header: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start"
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  source: {
    ...typography.label
  },
  title: {
    ...typography.cardTitle,
    color: colors.ink
  },
  time: {
    ...typography.bodySmall,
    color: colors.muted
  },
  message: {
    ...typography.body,
    color: colors.subtle
  },
  actionPill: {
    alignSelf: "flex-start",
    minHeight: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.mist,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  actionText: {
    ...typography.bodySmall
  }
});
