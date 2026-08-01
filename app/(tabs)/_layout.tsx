import { Tabs } from "expo-router";
import { BookOpen, Brain, Home, ListChecks, Sparkles } from "lucide-react-native";
import { colors, typography } from "@/lib/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.cream,
          borderTopColor: colors.cream,
          height: 84,
          paddingTop: 8
        },
        tabBarLabelStyle: {
          fontSize: typography.tab.fontSize,
          fontWeight: "700"
        }
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <Home color={color} size={21} /> }} />
      <Tabs.Screen name="library" options={{ title: "Library", tabBarIcon: ({ color }) => <BookOpen color={color} size={21} /> }} />
      <Tabs.Screen name="tasks" options={{ title: "Shepherds", tabBarIcon: ({ color }) => <ListChecks color={color} size={21} /> }} />
      <Tabs.Screen name="search" options={{ title: "Memory", tabBarIcon: ({ color }) => <Brain color={color} size={21} /> }} />
      <Tabs.Screen name="weekly" options={{ title: "Reset", tabBarIcon: ({ color }) => <Sparkles color={color} size={21} /> }} />
      <Tabs.Screen name="screenshots" options={{ href: null }} />
      <Tabs.Screen name="cleanup" options={{ href: null }} />
    </Tabs>
  );
}
