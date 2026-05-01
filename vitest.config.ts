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
    globals: true,
    setupFiles: [path.resolve(repoRoot, "src/test/setup.ts")],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(repoRoot, "./src") },
  },
});
