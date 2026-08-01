import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "@/components/Screen";
import { sourceLabels } from "@/features/tasks/mockTasks";
import { ShepherdTaskAction, ShepherdTaskSource } from "@/types/domain";
import { useShepherdTasks } from "@/features/tasks/useShepherdTasks";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

const sources: ShepherdTaskSource[] = ["photos", "screenshots", "tabs", "notes", "saved_posts", "documents", "receipts", "links", "reminders", "custom"];
const actions: ShepherdTaskAction[] = ["review", "delete", "archive", "save", "categorize", "summarize", "remind_later"];

const actionLabels: Record<ShepherdTaskAction, string> = {
  review: "Review",
  delete: "Let go",
  archive: "Keep safe",
  save: "Save",
  categorize: "Categorize",
  summarize: "Summarize",
  remind_later: "Remind me later"
};

export default function TaskCreateScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const tasks = useShepherdTasks((state) => state.tasks);
  const createTask = useShepherdTasks((state) => state.createTask);
  const updateTask = useShepherdTasks((state) => state.updateTask);
  const existing = useMemo(() => tasks.find((task) => task.id === id), [id, tasks]);

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [aiInstruction, setAiInstruction] = useState(existing?.aiInstruction ?? "");
  const [source, setSource] = useState<ShepherdTaskSource>(existing?.source ?? "custom");
  const [action, setAction] = useState<ShepherdTaskAction>(existing?.action ?? "review");

  function handleSave() {
    if (!name.trim() || !description.trim() || !aiInstruction.trim()) {
      Alert.alert("Add a little more detail", "Name the Shepherd, describe the saved things, and tell it what to notice.");
      return;
    }

    const draft = {
      name: name.trim(),
      description: description.trim(),
      aiInstruction: aiInstruction.trim(),
      source,
      action
    };

    if (existing) {
      updateTask(existing.id, draft);
      router.replace(`/tasks/${existing.id}`);
      return;
    }

    const task = createTask(draft);
    router.replace(`/tasks/${task.id}`);
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.kicker}>{existing ? "Tune a Shepherd" : "Create a Shepherd"}</Text>
          <Text style={styles.title}>{existing ? "Shape how this ritual cares for saved things." : "Teach Phone Shepherd what deserves gentle attention."}</Text>
        </View>

        <Field label="Shepherd name" value={name} onChangeText={setName} placeholder="Find notes that look like business ideas" />
        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Surface notes with startup ideas, product sketches, or customer pain points."
          multiline
        />
        <Field
          label="What should Shepherd notice?"
          value={aiInstruction}
          onChangeText={setAiInstruction}
          placeholder="Look for notes that mention problems, markets, pricing, competitors, or product ideas."
          multiline
        />

        <Text style={styles.sectionLabel}>Where should Shepherd look?</Text>
        <View style={styles.chips}>
          {sources.map((item) => (
            <Chip key={item} label={sourceLabels[item]} selected={source === item} onPress={() => setSource(item)} />
          ))}
        </View>

        <Text style={styles.sectionLabel}>How should it care for what it finds?</Text>
        <View style={styles.chips}>
          {actions.map((item) => (
            <Chip key={item} label={actionLabels[item]} selected={action === item} onPress={() => setAction(item)} />
          ))}
        </View>

        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveText}>{existing ? "Save ritual" : "Create Shepherd"}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: 80
  },
  header: {
    gap: spacing.sm
  },
  kicker: {
    ...typography.label,
    color: colors.sage
  },
  title: {
    ...typography.subtitle,
    color: colors.ink
  },
  field: {
    gap: spacing.sm
  },
  fieldLabel: {
    ...typography.button,
    color: colors.ink
  },
  input: {
    ...typography.body,
    minHeight: 54,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    color: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...shadows.quiet
  },
  multiline: {
    minHeight: 108,
    textAlignVertical: "top"
  },
  sectionLabel: {
    ...typography.button,
    color: colors.ink
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  chip: {
    minHeight: 42,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.quiet
  },
  chipSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.ink
  },
  chipTextSelected: {
    color: colors.cream
  },
  saveButton: {
    height: 56,
    borderRadius: radii.xl,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft
  },
  saveText: {
    ...typography.button,
    color: colors.cream
  }
});
