import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { checkSupabaseConnection, getConnectionStatus } from "@/lib/config";
import { deleteAnalysis } from "@/lib/api";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export default function PrivacyScreen() {
  const connection = getConnectionStatus();
  const [settings, setSettings] = useState({ sensitive: true, originals: false, reminders: true });

  useEffect(() => {
    AsyncStorage.getItem("phone-shepherd:privacy").then((value) => {
      if (value) setSettings(JSON.parse(value));
    }).catch(() => undefined);
  }, []);

  function updateSetting(key: keyof typeof settings, value: boolean) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    void AsyncStorage.setItem("phone-shepherd:privacy", JSON.stringify(next));
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.kicker}>Privacy</Text>
        <Text style={styles.title}>Your trust is part of the design.</Text>
        <Text style={styles.subtitle}>Choose what Shepherd can notice, remember, and forget.</Text>
      </View>

      <View style={styles.panel}>
        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>{connection.mode === "demo" ? "Demo mode" : "Production mode"}</Text>
          <Text style={styles.statusBody}>{connection.message}</Text>
          <Pressable
            style={styles.statusButton}
            onPress={() => {
              checkSupabaseConnection().then((result) => {
                Alert.alert(result.ok ? "Shepherd is connected" : "Shepherd needs setup", result.message);
              });
            }}
          >
            <Text style={styles.statusButtonText}>Check connection</Text>
          </Pressable>
        </View>
        <SettingRow title="Sensitive detection" body="Quietly flag passwords, finance, and personal details." enabled={settings.sensitive} onChange={(value) => updateSetting("sensitive", value)} />
        <SettingRow title="Original uploads" body="Keep off unless you explicitly need higher-detail care." enabled={settings.originals} onChange={(value) => updateSetting("originals", value)} />
        <SettingRow title="Gentle reset reminders" body="A quiet nudge when saved things may need your eyes." enabled={settings.reminders} onChange={(value) => updateSetting("reminders", value)} />
      </View>

      <Pressable
        style={styles.deleteButton}
        onPress={() => {
          Alert.alert("Ask Shepherd to forget?", "This removes stored summaries, memory links, and analysis notes.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => deleteAnalysis().catch((error) => Alert.alert("Shepherd could not forget yet", error.message))
            }
          ]);
        }}
      >
        <Text style={styles.deleteText}>Delete AI analysis data</Text>
      </Pressable>
    </Screen>
  );
}

function SettingRow({ title, body, enabled, onChange }: { title: string; body: string; enabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowBody}>{body}</Text>
      </View>
      <Switch value={enabled} onValueChange={onChange} trackColor={{ true: colors.sage }} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
    marginBottom: spacing.xl
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
  panel: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    overflow: "hidden",
    ...shadows.quiet
  },
  statusBox: {
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.mist
  },
  statusTitle: {
    ...typography.button,
    color: colors.ink
  },
  statusBody: {
    ...typography.bodySmall,
    color: colors.subtle
  },
  statusButton: {
    alignSelf: "flex-start",
    minHeight: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center"
  },
  statusButtonText: {
    ...typography.bodySmall,
    color: colors.cream
  },
  row: {
    minHeight: 94,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  rowCopy: {
    flex: 1,
    gap: spacing.xs
  },
  rowTitle: {
    ...typography.button,
    color: colors.ink
  },
  rowBody: {
    ...typography.bodySmall,
    color: colors.subtle
  },
  deleteButton: {
    height: 54,
    borderRadius: radii.xl,
    backgroundColor: colors.warningSoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
    ...shadows.quiet
  },
  deleteText: {
    ...typography.button,
    color: colors.warning
  }
});

