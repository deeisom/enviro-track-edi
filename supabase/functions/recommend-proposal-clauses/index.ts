import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { description, clauses } = await req.json();

    if (!description || !clauses) {
      return new Response(JSON.stringify({ error: "Missing description or clauses" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clauseList = clauses.map((c: any, i: number) =>
      `${i + 1}. [ID: ${c.id}] "${c.title}" (category: ${c.category}) - ${c.body.substring(0, 200)}...`
    ).join("\n");

    const systemPrompt = `You are an expert environmental consulting proposal advisor for Environmental Design Inc. (EDI). Given a natural language description of a job/project, recommend which contract clauses should be included in the proposal terms and conditions.

You have access to EDI's clause library. For each recommendation:
1. Identify clauses from the library that should be included
2. Suggest values for any [variableName] placeholders in those clauses
3. If the job description mentions concerns not covered by existing clauses, draft new clause suggestions

Return a JSON object using this exact tool schema.`;

    const userPrompt = `Job Description:
${description}

Available Clauses:
${clauseList}

Based on this job description, recommend which clauses to include and suggest variable values.`;

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        tools: [
          {
            type: "function",
            function: {
              name: "recommend_clauses",
              description: "Return clause recommendations for a proposal",
              parameters: {
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
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "recommend_clauses" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI recommendation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI did not return structured recommendations" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
