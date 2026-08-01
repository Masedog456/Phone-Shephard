import { StyleSheet, Text, View } from "react-native";
import { CameraOff, Copy, ImageOff, Receipt } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { CleanupRow } from "@/components/CleanupRow";
import { useMediaScan } from "@/features/media/useMediaScan";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export default function CleanupScreen() {
  const { stats } = useMediaScan();

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.kicker}>Memory Care</Text>
        <Text style={styles.title}>Keep the memories. Gently release the noise.</Text>
        <Text style={styles.subtitle}>Shepherd surfaces what may need your eyes first. Nothing changes without your approval.</Text>
      </View>

      <View style={styles.careNote}>
        <Text style={styles.careNoteTitle}>Your camera roll is treated like a memory space.</Text>
        <Text style={styles.careNoteBody}>Shepherd begins with gentle clues, then waits for your judgment.</Text>
      </View>

      <View style={styles.rows}>
        <CleanupRow icon={<Copy color={colors.ink} size={21} />} title="Photos that look alike" count={stats.duplicates} savings={stats.estimatedSavings} />
        <CleanupRow icon={<ImageOff color={colors.ink} size={21} />} title="Blurry moments" count={stats.blurry} savings="Needs your eyes" />
        <CleanupRow icon={<CameraOff color={colors.ink} size={21} />} title="Accidental captures" count={stats.accidental} savings="Needs your eyes" />
        <CleanupRow icon={<Receipt color={colors.ink} size={21} />} title="Saved information in photos" count={stats.screenshots} savings="Make findable" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
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
  careNote: {
    borderRadius: radii.xl,
    backgroundColor: colors.cardSoft,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.xl,
    ...shadows.quiet
  },
  careNoteTitle: {
    ...typography.cardTitle,
    color: colors.ink
  },
  careNoteBody: {
    ...typography.bodySmall,
    color: colors.subtle
  },
  rows: {
    gap: spacing.lg
  }
});
