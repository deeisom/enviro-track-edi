import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: repoRoot,
  plugins: [react()],
  test: {
    environment: "jsdom",
    env: {
      VITE_SUPABASE_PROJECT_ID: "wzlqrcrwhafzuqtnfhou",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-supabase-anon-key",
      VITE_SUPABASE_URL: "https://wzlqrcrwhafzuqtnfhou.supabase.co",
    },
    globals: true,
    setupFiles: [path.resolve(repoRoot, "src/test/setup.ts")],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "scripts/**/*.{test,spec}.mjs"],
  },
  resolve: {
    alias: { "@": path.resolve(repoRoot, "./src") },
  },
});
