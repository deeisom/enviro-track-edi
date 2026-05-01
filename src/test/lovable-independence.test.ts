import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { signInWithGoogle } from "@/services/auth";

const supabaseAuthMock = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithOAuth: supabaseAuthMock.signInWithOAuth,
    },
  },
}));

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Lovable independence", () => {
  it("uses Supabase OAuth directly for Google sign-in", async () => {
    supabaseAuthMock.signInWithOAuth.mockResolvedValue({ data: {}, error: null });

    await signInWithGoogle("https://envirotrack.example");

    expect(supabaseAuthMock.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "https://envirotrack.example" },
    });
  });

  it("does not keep the Lovable auth package or integration module", () => {
    const packageJson = JSON.parse(readRepoFile("package.json"));
    const packageLock = readRepoFile("package-lock.json");

    expect(packageJson.dependencies).not.toHaveProperty("@lovable.dev/cloud-auth-js");
    expect(packageLock).not.toContain("@lovable.dev/cloud-auth-js");
    expect(existsSync(join(process.cwd(), "src/integrations/lovable"))).toBe(false);
  });

  it("constructs proposal AI edge requests for OpenAI Responses API", () => {
    const generateSource = readRepoFile("supabase/functions/generate-proposal-content/index.ts");
    const recommendSource = readRepoFile("supabase/functions/recommend-proposal-clauses/index.ts");

    for (const source of [generateSource, recommendSource]) {
      expect(source).toContain("https://api.openai.com/v1/responses");
      expect(source).toContain('Deno.env.get("OPENAI_API_KEY")');
      expect(source).toContain('Deno.env.get("OPENAI_MODEL") || "gpt-5-mini"');
      expect(source).toContain("model: OPENAI_MODEL");
      expect(source).toContain("instructions:");
      expect(source).toContain("input:");
      expect(source).not.toContain("LOVABLE");
      expect(source).not.toContain("ai.gateway.lovable.dev");
    }

    expect(recommendSource).toContain('type: "json_schema"');
  });
});
