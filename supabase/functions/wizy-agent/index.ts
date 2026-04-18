import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Wewe ni Wizy, msaidizi wa AI kwa app ya TeleMed Tanzania.
Lugha kuu ni Kiswahili. Jibu kwa Kiswahili kifupi na cha kirafiki.

Una uwezo wa:
- Kutafuta madaktari, hospitali, famasi, maabara
- Kuangalia miadi ya mtumiaji
- Kuomba kuweka miadi (booking request)
- Kutuma ujumbe kwa daktari
- Kuongeza dawa kwenye cart na kuagiza
- Kuonyesha rekodi za matibabu
- Kuchambua dalili za afya

Tumia tools zilizopatikana ku-fetch data halisi badala ya kubuni. Endapo mtumiaji haja-login, mwambie a-login kwanza.
Kama ni dharura ya kiafya, sema wazi na shauri kwenda hospitali haraka.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_doctors",
      description: "Tafuta madaktari kwa jina, utaalamu, au eneo",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search term (specialty/name)" },
          limit: { type: "number", default: 5 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_facilities",
      description: "Tafuta hospitali, famasi au maabara",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["hospitals", "pharmacies", "laboratories"] },
          query: { type: "string" },
        },
        required: ["type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_my_appointments",
      description: "Onyesha miadi ya mtumiaji aliye-login",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "create_appointment_request",
      description: "Omba kuweka miadi na daktari",
      parameters: {
        type: "object",
        properties: {
          doctor_id: { type: "string" },
          appointment_date: { type: "string", description: "ISO date-time" },
          symptoms: { type: "string" },
          consultation_type: { type: "string", enum: ["video", "audio", "chat", "in_person"] },
        },
        required: ["doctor_id", "appointment_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_medicines",
      description: "Tafuta dawa kwenye famasi zote",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_to_cart",
      description: "Ongeza dawa kwenye cart ya mtumiaji",
      parameters: {
        type: "object",
        properties: {
          medicine_id: { type: "string" },
          quantity: { type: "number", default: 1 },
        },
        required: ["medicine_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate_to",
      description: "Pelekea mtumiaji ukurasa fulani kwenye app",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Route path, mfano /appointments, /doctors-list, /cart, /messages, /medical-records, /nearby, /prescriptions",
          },
        },
        required: ["path"],
      },
    },
  },
];

async function executeTool(
  name: string,
  args: any,
  supabase: any,
  userId: string | null
) {
  try {
    switch (name) {
      case "search_doctors": {
        let q = supabase
          .from("doctor_profiles")
          .select("user_id, bio, consultation_fee, doctor_type, experience_years, rating, profiles!inner(first_name, last_name, avatar_url)")
          .limit(args.limit || 5);
        if (args.query) q = q.ilike("doctor_type", `%${args.query}%`);
        const { data } = await q;
        return { doctors: data || [] };
      }
      case "search_facilities": {
        const { data } = await supabase
          .from(args.type)
          .select("id, name, address, phone, logo_url, rating")
          .eq("is_verified", true)
          .limit(5);
        return { items: data || [], type: args.type };
      }
      case "list_my_appointments": {
        if (!userId) return { error: "Tafadhali ingia kwanza" };
        const { data } = await supabase
          .from("appointments")
          .select("id, appointment_date, status, symptoms, consultation_type")
          .eq("patient_id", userId)
          .order("appointment_date", { ascending: false })
          .limit(10);
        return { appointments: data || [] };
      }
      case "create_appointment_request": {
        if (!userId) return { error: "Tafadhali ingia kwanza" };
        const { data, error } = await supabase
          .from("appointments")
          .insert({
            patient_id: userId,
            doctor_id: args.doctor_id,
            appointment_date: args.appointment_date,
            symptoms: args.symptoms || null,
            consultation_type: args.consultation_type || "video",
            status: "scheduled",
          })
          .select()
          .single();
        if (error) return { error: error.message };
        return { success: true, appointment: data };
      }
      case "search_medicines": {
        const { data } = await supabase
          .from("pharmacy_medicines")
          .select("id, name, price, in_stock, dosage, pharmacy_id, pharmacies!inner(name)")
          .ilike("name", `%${args.query}%`)
          .eq("in_stock", true)
          .limit(10);
        return { medicines: data || [] };
      }
      case "add_to_cart": {
        if (!userId) return { error: "Tafadhali ingia kwanza" };
        const { data: med } = await supabase
          .from("pharmacy_medicines")
          .select("pharmacy_id")
          .eq("id", args.medicine_id)
          .single();
        if (!med) return { error: "Dawa haijapatikana" };
        const { error } = await supabase.from("cart_items").upsert(
          {
            user_id: userId,
            medicine_id: args.medicine_id,
            pharmacy_id: med.pharmacy_id,
            quantity: args.quantity || 1,
          },
          { onConflict: "user_id,medicine_id" }
        );
        if (error) return { error: error.message };
        return { success: true };
      }
      case "navigate_to": {
        return { navigate: args.path };
      }
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e: any) {
    return { error: e.message || "Tool execution failed" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    let userId: string | null = null;
    if (authHeader) {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id || null;
    }

    const conversation: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    // Up to 4 tool-call iterations
    for (let i = 0; i < 4; i++) {
      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: conversation,
            tools: TOOLS,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Umefika kikomo. Jaribu tena baadaye." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "Credits zimekwisha. Ongeza credits." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const t = await response.text();
        console.error("AI error:", response.status, t);
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const msg = choice?.message;
      if (!msg) break;

      conversation.push(msg);

      const toolCalls = msg.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        const navigateActions: string[] = [];
        return new Response(
          JSON.stringify({
            reply: msg.content || "",
            actions: navigateActions,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Execute every tool call
      const navActions: string[] = [];
      for (const tc of toolCalls) {
        const fnName = tc.function?.name;
        let args: any = {};
        try {
          args = JSON.parse(tc.function?.arguments || "{}");
        } catch {}
        const result = await executeTool(fnName, args, supabase, userId);
        if (result?.navigate) navActions.push(result.navigate);
        conversation.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }

    return new Response(
      JSON.stringify({ reply: "Samahani, sijaweza kukamilisha ombi." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("wizy-agent error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Hitilafu isiyojulikana" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
