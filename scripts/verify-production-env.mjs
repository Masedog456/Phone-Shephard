import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");

if (!existsSync(envPath)) {
  fail("Missing .env. Copy .env.example to .env first.");
}

const env = parseEnv(readFileSync(envPath, "utf8"));
const checks = [
  ["EXPO_PUBLIC_DEMO_MODE", (value) => value === "false", "Set EXPO_PUBLIC_DEMO_MODE=false for production testing."],
  [
    "EXPO_PUBLIC_SUPABASE_URL",
    (value) => value?.startsWith("https://") && value.includes(".supabase.co"),
    "Add your Supabase project URL."
  ],
  [
    "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    (value) => Boolean(value) && value !== "your-anon-key" && value.length > 30,
    "Add your Supabase anon key."
  ]
];

const failures = checks
  .map(([key, test, message]) => ({ key, ok: test(env[key]), message }))
  .filter((check) => !check.ok);

if (failures.length) {
  for (const failure of failures) {
    console.error(`- ${failure.key}: ${failure.message}`);
  }
  process.exit(1);
}

console.log("Production env looks ready for Expo.");

function parseEnv(contents) {
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        if (index === -1) {
          return [line, ""];
        }
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
