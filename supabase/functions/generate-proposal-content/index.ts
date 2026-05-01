import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-5-mini";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const COMPANY_CONTEXT = `IMPORTANT COMPANY IDENTITY: "EDI" is the abbreviation for "Environmental Design Inc.", an environmental consulting firm. Always expand "EDI" as "Environmental Design Inc." on first mention within the section, then use "EDI" thereafter. Never refer to the company by any other name (do NOT use "Environmental Dynamics", "Environmental Designs", or any variation).`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { section, inputs } = await req.json();

    if (!section || !inputs) {
      return jsonResponse({ error: "Missing section or inputs" }, 400);
    }

    if (!OPENAI_API_KEY) {
      return jsonResponse({ error: "OPENAI_API_KEY not configured" }, 500);
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (section === "background") {
      systemPrompt = `${COMPANY_CONTEXT}\n\nYou are a professional environmental consulting proposal writer for Environmental Design Inc. (EDI). Write a formal "Background" section for a proposal. The background should explain why the client requested the work, what condition or concern led to the proposal, where the issue exists, and why the service is needed. Use a professional, third-person tone. Do not invent specific sample counts, certifications, legal outcomes, or compliance claims. Write 2-4 paragraphs. Do not include headers or titles.`;

      userPrompt = `Write a Background section for this proposal:
- Company: Environmental Design Inc. (EDI)
- Service Type: ${inputs.serviceType || "Environmental evaluation"}
- Issue/Concern: ${inputs.concern || "Not specified"}
- Affected Area(s): ${inputs.affectedAreas || "Not specified"}
- Reason Work Requested: ${inputs.reasonRequested || "Not specified"}
- Client Context: ${inputs.clientContext || "Not specified"}
- Notable Site Conditions: ${inputs.siteConditions || "None noted"}
- Site/Facility Name: ${inputs.siteName || "Not specified"}
- Building/Area: ${inputs.buildingArea || "Not specified"}`;
    } else if (section === "scope") {
      systemPrompt = `${COMPANY_CONTEXT}\n\nYou are a professional environmental consulting proposal writer for Environmental Design Inc. (EDI). Write a formal "Scope of Work" section for a proposal. The scope should explain what services will be performed, what sampling/testing/inspection activities will occur, what equipment/methods will be used if appropriate, what deliverables will be produced, and what follow-up interpretation/reporting is included. Use a professional, third-person tone. Use numbered or bulleted lists where appropriate for clarity. Do not invent specific pricing, sample counts beyond what is provided, certifications, or compliance claims. Write 3-5 paragraphs. Do not include headers or titles.`;

      userPrompt = `Write a Scope of Work section for this proposal:
- Company: Environmental Design Inc. (EDI)
- Service Type: ${inputs.serviceType || "Environmental evaluation"}
- Selected Services: ${inputs.selectedServices || "Not specified"}
- Methods/Sample Types: ${inputs.methods || "Not specified"}
- Deliverables: ${inputs.deliverables || "Written report with findings and recommendations"}
- Turnaround Assumptions: ${inputs.turnaround || "Standard turnaround"}
- Project-Specific Exclusions: ${inputs.exclusions || "None"}
- Special Constraints: ${inputs.constraints || "None"}
- Site/Facility Name: ${inputs.siteName || "Not specified"}
- Building/Area: ${inputs.buildingArea || "Not specified"}`;
    } else {
      return jsonResponse({ error: "Invalid section. Must be 'background' or 'scope'." }, 400);
    }

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
        max_output_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return jsonResponse({ error: response.status === 429 ? "Rate limit exceeded. Please try again in a moment." : "AI generation failed" }, response.status === 429 ? 429 : 500);
    }

    const data = await response.json();
    const generatedText = extractOutputText(data);

    if (!generatedText) {
      return jsonResponse({ error: "AI did not return generated text" }, 500);
    }

    return jsonResponse({ text: generatedText });
  } catch (error) {
    console.error("Error:", error);
    return jsonResponse({ error: errorMessage(error) }, 500);
  }
});
