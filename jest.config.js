/**
 * Minimal Jest setup using the Expo-standard preset.
 *
 * Two projects, because the code under test runs in two different runtimes:
 *  - "app"    covers the React Native client (src/, app/) via jest-expo.
 *  - "shared" covers the Deno Edge Function helpers in supabase/functions/_shared, which are
 *             written without Deno globals or remote imports precisely so they can be tested
 *             here. Only .ts extensionless-safe modules belong in that project.
 */
module.exports = {
  projects: [
    {
      displayName: "app",
      preset: "jest-expo",
      testMatch: ["<rootDir>/src/**/*.test.ts", "<rootDir>/src/**/*.test.tsx"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1"
      },
      transformIgnorePatterns: [
        "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
      ]
    },
    {
      displayName: "shared",
      testEnvironment: "node",
      testMatch: ["<rootDir>/supabase/functions/**/*.test.ts"],
      transform: {
        "^.+\\.ts$": ["babel-jest", { presets: [["babel-preset-expo", { jsxRuntime: "automatic" }]] }]
      },
      // The Edge Functions import each other with explicit .ts extensions (Deno style).
      // Map those back to real files so Node can resolve them.
      moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.ts$": "$1"
      }
    }
  ]
};
