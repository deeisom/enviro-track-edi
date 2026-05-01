import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-5-mini";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const recommendationSchema = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          clauseId: { type: "string", description: "The ID of the clause from the library" },
          reason: { type: "string", description: "Brief reason why this clause is recommended" },
          suggestedVariables: {
            type: "object",
            description: "Suggested values for [variableName] placeholders in the clause body",
            additionalProperties: { type: "string" },
          },
        },
        required: ["clauseId", "reason"],
        additionalProperties: false,
      },
    },
    newClauseSuggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          category: { type: "string" },
          reason: { type: "string" },
        },
        required: ["title", "body", "category", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["recommendations", "newClauseSuggestions"],
  additionalProperties: false,
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function extractOutputText(data: any): string {
  if (typeof data?.output_text === "string") return data.output_text.trim();

  const output = Array.isArray(data?.output) ? data.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === "string") return part.text.trim();
    }
  }

  return "";
}

function parseJsonObject(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { description, clauses } = await req.json();

    if (!description || !clauses) {
      return jsonResponse({ error: "Missing description or clauses" }, 400);
    }

    if (!OPENAI_API_KEY) {
      return jsonResponse({ error: "OPENAI_API_KEY not configured" }, 500);
    }

    const clauseList = clauses.map((c: any, i: number) =>
      `${i + 1}. [ID: ${c.id}] "${c.title}" (category: ${c.category}) - ${c.body.substring(0, 200)}...`
    ).join("\n");

    const systemPrompt = `You are an expert environmental consulting proposal advisor for Environmental Design Inc. (EDI). Given a natural language description of a job/project, recommend which contract clauses should be included in the proposal terms and conditions.

You have access to EDI's clause library. For each recommendation:
1. Identify clauses from the library that should be included
2. Suggest values for any [variableName] placeholders in those clauses
3. If the job description mentions concerns not covered by existing clauses, draft new clause suggestions

Return only a JSON object matching the requested schema.`;

    const userPrompt = `Job Description:
${description}

Available Clauses:
${clauseList}

Based on this job description, recommend which clauses to include and suggest variable values.`;

    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: systemPrompt,
        input: userPrompt,
        max_output_tokens: 2500,
        text: {
          format: {
            type: "json_schema",
            name: "clause_recommendations",
            strict: false,
            schema: recommendationSchema,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      if (response.status === 429) {
        return jsonResponse({ error: "Rate limit exceeded. Please try again in a moment." }, 429);
      }
      return jsonResponse({ error: "AI recommendation failed" }, 500);
    }

    const data = await response.json();
    const outputText = extractOutputText(data);

    if (!outputText) {
      return jsonResponse({ error: "AI did not return structured recommendations" }, 500);
    }

    const result = parseJsonObject(outputText);

    return jsonResponse(result);
  } catch (error) {
    console.error("Error:", error);
    return jsonResponse({ error: errorMessage(error) }, 500);
  }
});
