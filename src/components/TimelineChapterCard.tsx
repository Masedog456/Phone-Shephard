import { StyleSheet, Text, View } from "react-native";
import { Bookmark, PenLine, Sparkles } from "lucide-react-native";
import { DigitalLifeChapter, TimelineMetric } from "@/types/domain";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export function TimelineChapterCard({ chapter, isLast = false }: { chapter: DigitalLifeChapter; isLast?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={styles.dot} />
        {!isLast ? <View style={styles.line} /> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.date}>{chapter.month} {chapter.year}</Text>
        <Text style={styles.title}>{chapter.title}</Text>
        <Text style={styles.narrative}>{chapter.narrative}</Text>

        <Text style={styles.label}>You were focused on</Text>
        <View style={styles.focusRow}>
          {chapter.focusedOn.map((focus) => (
            <Text key={focus} style={styles.focusPill}>{focus}</Text>
          ))}
        </View>

        <MetricSection icon={<Bookmark color={colors.sage} size={17} />} title="You saved" metrics={chapter.saved} />
        <MetricSection icon={<PenLine color={colors.clay} size={17} />} title="You created" metrics={chapter.created} />

        <View style={styles.turningPoint}>
          <Sparkles color={colors.sage} size={17} />
          <View style={styles.turningCopy}>
            <Text style={styles.turningLabel}>A moment that mattered</Text>
            <Text style={styles.turningText}>{chapter.turningPoint}</Text>
          </View>
        </View>

        <Text style={styles.evolution}>{chapter.evolution}</Text>
      </View>
    </View>
  );
}

function MetricSection({ icon, title, metrics }: { icon: React.ReactNode; title: string; metrics: TimelineMetric[] }) {
  return (
    <View style={styles.metricSection}>
      <View style={styles.metricHeader}>{icon}<Text style={styles.metricTitle}>{title}</Text></View>
      <View style={styles.metrics}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metric}>
            <Text style={styles.metricCount}>{metric.count}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.md },
  rail: { width: 20, alignItems: "center" },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.sage, marginTop: 22 },
  line: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  card: { flex: 1, borderRadius: radii.xl, backgroundColor: colors.card, padding: spacing.lg, gap: spacing.md, marginBottom: spacing.lg, ...shadows.quiet },
  date: { ...typography.label, color: colors.sage },
  title: { ...typography.subtitle, color: colors.ink },
  narrative: { ...typography.body, color: colors.subtle },
  label: { ...typography.label, color: colors.sage },
  focusRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  focusPill: { ...typography.bodySmall, color: colors.ink, backgroundColor: colors.mist, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  metricSection: { gap: spacing.sm },
  metricHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  metricTitle: { ...typography.label, color: colors.ink },
  metrics: { flexDirection: "row", gap: spacing.sm },
  metric: { flex: 1, borderRadius: radii.lg, backgroundColor: colors.cardSoft, padding: spacing.md, gap: spacing.xs },
  metricCount: { ...typography.subtitle, color: colors.ink },
  metricLabel: { ...typography.bodySmall, color: colors.subtle },
  turningPoint: { borderRadius: radii.lg, backgroundColor: colors.mist, padding: spacing.md, flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  turningCopy: { flex: 1, gap: spacing.xs },
  turningLabel: { ...typography.label, color: colors.sage },
  turningText: { ...typography.bodySmall, color: colors.ink },
  evolution: { ...typography.bodySmall, color: colors.blue, fontStyle: "italic" }
});
