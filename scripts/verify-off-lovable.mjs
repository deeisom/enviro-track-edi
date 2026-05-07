import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const strictEnv = process.argv.includes("--strict-env");

const errors = [];
const warnings = [];
const notes = [];

function readText(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function parseEnv(path) {
  if (!existsSync(join(root, path))) return {};

  return Object.fromEntries(
    readText(path)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const equalsIndex = line.indexOf("=");
        if (equalsIndex === -1) return [line, ""];

        const key = line.slice(0, equalsIndex).trim();
        const value = line
          .slice(equalsIndex + 1)
          .trim()
          .replace(/^['"]|['"]$/g, "");

        return [key, value];
      }),
  );
}

function commandExists(command) {
  const lookup = process.platform === "win32" ? "where.exe" : "command";
  const args = process.platform === "win32" ? [command] : ["-v", command];
  const result = spawnSync(lookup, args, { stdio: "ignore", shell: process.platform !== "win32" });
  return result.status === 0;
}

function scanFiles(paths, forbiddenText) {
  for (const path of paths) {
    if (existsSync(join(root, path)) && readText(path).includes(forbiddenText)) {
      errors.push(`${path} still contains ${forbiddenText}`);
    }
  }
}

const packageJson = readJson("package.json");
const packageLock = readText("package-lock.json");
const envExample = parseEnv(".env.example");
const envLocal = parseEnv(".env");
const envLocalVite = parseEnv(".env.local");
const env = { ...envExample, ...envLocal, ...envLocalVite, ...process.env };
const configToml = readText("supabase/config.toml");
const projectIdMatch = configToml.match(/project_id\s*=\s*"([^"]+)"/);
const configProjectId = projectIdMatch?.[1];

if (packageJson.dependencies?.["@lovable.dev/cloud-auth-js"]) {
  errors.push("package.json still depends on @lovable.dev/cloud-auth-js");
}

if (packageLock.includes("@lovable.dev/cloud-auth-js")) {
  errors.push("package-lock.json still contains @lovable.dev/cloud-auth-js");
}

if (existsSync(join(root, "src/integrations/lovable"))) {
  errors.push("src/integrations/lovable still exists");
}

scanFiles(
  [
    "supabase/functions/generate-proposal-content/index.ts",
    "supabase/functions/recommend-proposal-clauses/index.ts",
  ],
  "ai.gateway.lovable.dev",
);

for (const path of [
  "vercel.json",
  "supabase/config.toml",
  "supabase/migrations",
  "supabase/functions/generate-proposal-content/index.ts",
  "supabase/functions/recommend-proposal-clauses/index.ts",
]) {
  if (!existsSync(join(root, path))) {
    errors.push(`${path} is missing`);
  }
}

const migrationCount = existsSync(join(root, "supabase/migrations"))
  ? readdirSync(join(root, "supabase/migrations")).filter((file) => file.endsWith(".sql")).length
  : 0;

if (migrationCount === 0) {
  errors.push("No Supabase migrations were found");
} else {
  notes.push(`${migrationCount} Supabase migration files found`);
}

const requiredFrontendEnv = [
  "VITE_SUPABASE_PROJECT_ID",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
];

for (const key of requiredFrontendEnv) {
  if (!env[key] || env[key].startsWith("your-")) {
    const message = `${key} is not set to a real value`;
    if (strictEnv) errors.push(message);
    else warnings.push(message);
  }
}

if (!existsSync(join(root, ".env")) && !existsSync(join(root, ".env.local"))) {
  const message = "Local .env or .env.local is missing; create one from .env.example before running against Supabase";
  if (strictEnv) errors.push(message);
  else warnings.push(message);
}

if (configProjectId && env.VITE_SUPABASE_PROJECT_ID && configProjectId !== env.VITE_SUPABASE_PROJECT_ID) {
  errors.push(
    `supabase/config.toml project_id (${configProjectId}) does not match VITE_SUPABASE_PROJECT_ID (${env.VITE_SUPABASE_PROJECT_ID})`,
  );
}

if (
  env.VITE_SUPABASE_PROJECT_ID &&
  env.VITE_SUPABASE_URL &&
  !env.VITE_SUPABASE_URL.includes(env.VITE_SUPABASE_PROJECT_ID)
) {
  warnings.push("VITE_SUPABASE_URL does not include VITE_SUPABASE_PROJECT_ID; double-check the backend target");
}

const localSupabaseCli = existsSync(join(root, "node_modules/supabase/bin/supabase.exe"))
  || existsSync(join(root, "node_modules/supabase/bin/supabase"));

if (localSupabaseCli) {
  notes.push("local Supabase CLI found");
} else if (commandExists("supabase")) {
  notes.push("supabase CLI found");
} else {
  warnings.push("supabase CLI is not available");
}

for (const command of ["vercel"]) {
  if (commandExists(command)) {
    notes.push(`${command} CLI found`);
  } else {
    warnings.push(`${command} CLI is not available on PATH`);
  }
}

const functionSources = [
  readText("supabase/functions/generate-proposal-content/index.ts"),
  readText("supabase/functions/recommend-proposal-clauses/index.ts"),
];

for (const [index, source] of functionSources.entries()) {
  const label = index === 0 ? "generate-proposal-content" : "recommend-proposal-clauses";
  if (!source.includes('Deno.env.get("OPENAI_API_KEY")')) {
    errors.push(`${label} does not read OPENAI_API_KEY from Supabase secrets`);
  }
  if (!source.includes("https://api.openai.com/v1/responses")) {
    errors.push(`${label} does not call the OpenAI Responses API directly`);
  }
}

console.log("Off-Lovable readiness check");

for (const note of notes) {
  console.log(`OK: ${note}`);
}

for (const warning of warnings) {
  console.log(`Warning: ${warning}`);
}

for (const error of errors) {
  console.log(`Error: ${error}`);
}

if (errors.length > 0) {
  process.exitCode = 1;
} else {
  console.log(
    warnings.length > 0
      ? "Ready with warnings: repo checks passed, but account setup remains"
      : "Ready: repo checks passed",
  );
}
