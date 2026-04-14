import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const LOVABLE_AI_URL = "https://api.lovable.dev/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { section, inputs } = await req.json();

    if (!section || !inputs) {
      return new Response(JSON.stringify({ error: "Missing section or inputs" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (section === "background") {
      systemPrompt = `You are a professional environmental consulting proposal writer for Environmental Dynamics Inc. (EDI). Write a formal "Background" section for a proposal. The background should explain why the client requested the work, what condition or concern led to the proposal, where the issue exists, and why the service is needed. Use a professional, third-person tone. Do not invent specific sample counts, certifications, legal outcomes, or compliance claims. Write 2-4 paragraphs. Do not include headers or titles.`;

      userPrompt = `Write a Background section for this proposal:
- Service Type: ${inputs.serviceType || "Environmental evaluation"}
- Issue/Concern: ${inputs.concern || "Not specified"}
- Affected Area(s): ${inputs.affectedAreas || "Not specified"}
- Reason Work Requested: ${inputs.reasonRequested || "Not specified"}
- Client Context: ${inputs.clientContext || "Not specified"}
- Notable Site Conditions: ${inputs.siteConditions || "None noted"}
- Site/Facility Name: ${inputs.siteName || "Not specified"}
- Building/Area: ${inputs.buildingArea || "Not specified"}`;
    } else if (section === "scope") {
      systemPrompt = `You are a professional environmental consulting proposal writer for Environmental Dynamics Inc. (EDI). Write a formal "Scope of Work" section for a proposal. The scope should explain what services will be performed, what sampling/testing/inspection activities will occur, what equipment/methods will be used if appropriate, what deliverables will be produced, and what follow-up interpretation/reporting is included. Use a professional, third-person tone. Use numbered or bulleted lists where appropriate for clarity. Do not invent specific pricing, sample counts beyond what is provided, certifications, or compliance claims. Write 3-5 paragraphs. Do not include headers or titles.`;

      userPrompt = `Write a Scope of Work section for this proposal:
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
      return new Response(JSON.stringify({ error: "Invalid section. Must be 'background' or 'scope'." }), {
        status: 400,
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
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ text: generatedText }), {
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
