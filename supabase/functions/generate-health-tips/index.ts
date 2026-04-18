import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { count = 5, category } = await req.json().catch(() => ({}));
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const prompt = `Tengeneza ${count} health tips fupi kwa Kiswahili${category ? ` kuhusu ${category}` : ""}. Kila tip iwe na "title" (maneno 3-5) na "content" (sentensi 1-2 zenye ushauri wa vitendo).`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Wewe ni mshauri wa afya wa Kiswahili. Toa ushauri wa kweli, sahihi, na rahisi kuelewa." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_tips",
            description: "Save the generated health tips",
            parameters: {
              type: "object",
              properties: {
                tips: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      content: { type: "string" },
                      category: { type: "string" },
                    },
                    required: ["title", "content"],
                  },
                },
              },
              required: ["tips"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_tips" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      throw new Error(`AI: ${aiResp.status} ${t}`);
    }

    const data = await aiResp.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = JSON.parse(tc?.function?.arguments || "{}");
    const tips = args.tips || [];

    if (tips.length) {
      await supabase.from("ai_health_tips").insert(
        tips.map((t: any) => ({
          title: t.title,
          content: t.content,
          category: t.category || category || "general",
          generated_by_ai: true,
          is_approved: true,
          is_active: true,
        }))
      );
    }

    return new Response(JSON.stringify({ success: true, count: tips.length, tips }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-health-tips error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
