import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Wewe ni Wizy — msaidizi mahiri wa afya wa TeleMed Tanzania.
Lugha kuu: Kiswahili (jibu kwa Kiingereza tu kama mtumiaji ameandika kwa Kiingereza).

JUKUMU: (A) Toa elimu sahihi ya afya (magonjwa, dawa, lishe, msaada wa kwanza). (B) Tumia tools kufanya vitendo (kutafuta, kuagiza, kuweka miadi, ujumbe).

KANUNI YA ID (LAZIMA): KAMWE usiulize medicine_id, doctor_id, pharmacy_id n.k. Tumia tools kwa MAJINA. Tools zenyewe zinatatua ID. Kama hupati matokeo, pendekeza search au browse_catalog — usiulize ID.

KANUNI ZA UANDISHI:
1. Anza na tool — usiulize swali la ziada kabla ya kutafuta. Search_medicines/doctors hutumia fuzzy match (huvumilia typos kama "panadl" → "Panadol").
2. Baada ya tool, andika sentensi 1 tu. UI inaonyesha cards.
3. Kama matokeo ni 0, jibu na pendekezo: "Sijapata X. Jaribu jina la kibiashara au ingredient (mfano paracetamol kwa Panadol). Au tumia Soko la Dawa." Pia toa browse_catalog auto.
4. Elimu safi: aya 1-2 (sentensi 3-6), wazi, ya vitendo. Tumia bullets kwa hatua.

DHARURA (kupumua shida, kifua kuuma, damu nyingi, kuzimia) → emergency_guidance MARA MOJA.

═══ MTUMIAJI ASIYE-LOGIN (GUEST) ═══
Guest ANAWEZA: kutafuta madaktari/hospitali/famasi/maabara, kuona dawa, ratiba, taarifa za umma. Sema "ANGALIA bila kuingia" — ruhusu.

Guest AKIOMBA kitendo (kuagiza dawa, kuweka miadi, kutuma ujumbe, ku-post tatizo):
1. Mwambie: "Naweza kufanya hivyo kwa niaba yako. Tafadhali nipe email AU namba yako ya simu uliyotumia kujisajili."
2. Akikupa, tumia lookup_account.
3. Kama account haipo: "Sijakupata. Tafadhali jisajili kwanza kupitia 'Mimi'."
4. Kama account ipo: tumia queue_pending_action({ contact, action_type, payload, human_summary }) — payload lazima iwe na ID zilizotatuliwa (mfano medicine_id+pharmacy_id+quantity tayari) zilizopatikana kupitia search_medicines kabla.
5. Mwambie guest: "Nimetuma ombi kwenye akaunti yako. Utapata arifa kwenye simu yako — ukikubali, nitatekeleza."

KAMWE: Usimuulize guest password. Usitekeleze kitendo bila confirmation flow ya pending_actions.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_doctors",
      description: "Tafuta madaktari kwa jina au utaalamu (fuzzy/typo-tolerant)",
      parameters: { type: "object", properties: { query: { type: "string" }, limit: { type: "number", default: 5 } } },
    },
  },
  {
    type: "function",
    function: {
      name: "search_facilities",
      description: "Tafuta hospitali, famasi, polyclinics au maabara",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["hospitals", "pharmacies", "laboratories", "polyclinics"] },
          query: { type: "string" },
          limit: { type: "number", default: 5 },
        },
        required: ["type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_medicines",
      description: "Tafuta dawa kwa jina, brand au ingredient. Fuzzy match (huvumilia typos). Inarudisha ID zilizotatuliwa.",
      parameters: { type: "object", properties: { query: { type: "string" }, limit: { type: "number", default: 8 } }, required: ["query"] },
    },
  },
  {
    type: "function",
    function: {
      name: "browse_catalog",
      description: "Vinjari soko la dawa kwa filters (category, max_price, in_stock_only). Tumia mtumiaji akiomba 'onyesha dawa zote' au baada ya search yenye 0 matokeo.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "mfano: painkillers, antibiotics, vitamins" },
          max_price: { type: "number" },
          in_stock_only: { type: "boolean", default: true },
          limit: { type: "number", default: 10 },
        },
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
      description: "Weka miadi. Tumia doctor_name (jina). Hutumika tu mtumiaji akiwa amesajili kupitia auth — guest tumia lookup_account+queue_pending_action.",
      parameters: {
        type: "object",
        properties: {
          doctor_name: { type: "string" },
          appointment_date: { type: "string" },
          symptoms: { type: "string" },
          consultation_type: { type: "string", enum: ["video", "audio", "chat", "in_person"], default: "video" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_to_cart",
      description: "Ongeza dawa kwenye cart kwa medicine_name. Hutumika kwa user aliye-login pekee.",
      parameters: {
        type: "object",
        properties: {
          medicine_name: { type: "string" },
          pharmacy_name: { type: "string" },
          quantity: { type: "number", default: 1 },
        },
        required: ["medicine_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_account",
      description: "Thibitisha kama account ipo kwa email au namba ya simu. Tumia kwa GUEST anayetaka kufanya kitendo.",
      parameters: { type: "object", properties: { contact: { type: "string", description: "email au namba ya simu" } }, required: ["contact"] },
    },
  },
  {
    type: "function",
    function: {
      name: "queue_pending_action",
      description: "Tengeneza ombi linalosubiri thibitisho la mmiliki wa account. Tumia kwa GUEST baada ya lookup_account kufanikiwa. payload lazima iwe na ID zilizotatuliwa.",
      parameters: {
        type: "object",
        properties: {
          contact: { type: "string" },
          action_type: { type: "string", enum: ["add_to_cart", "create_appointment", "send_message", "post_problem", "order_medicine"] },
          payload: { type: "object", description: "ID & data zote zinazohitajika (mfano medicine_id, pharmacy_id, quantity)" },
          human_summary: { type: "string", description: "Maelezo mafupi: 'Nunua Panadol x2 kutoka Famasi X'" },
        },
        required: ["contact", "action_type", "payload", "human_summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_my_messages",
      description: "Onyesha mazungumzo ya mtumiaji aliye-login",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "post_patient_problem",
      description: "Pos tatizo la mgonjwa",
      parameters: {
        type: "object",
        properties: {
          problem_text: { type: "string" },
          urgency_level: { type: "string", enum: ["low", "normal", "high", "urgent"], default: "normal" },
          category: { type: "string", default: "general" },
        },
        required: ["problem_text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_medical_records",
      description: "Onyesha rekodi za matibabu",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_symptoms",
      description: "Pokea dalili na shauri specialty",
      parameters: { type: "object", properties: { symptoms: { type: "string" } }, required: ["symptoms"] },
    },
  },
  {
    type: "function",
    function: {
      name: "emergency_guidance",
      description: "Toa first-aid ya dharura",
      parameters: { type: "object", properties: { situation: { type: "string" } }, required: ["situation"] },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate_to",
      description: "Pelekea ukurasa fulani",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    },
  },
];

async function executeTool(name: string, args: any, supabase: any, adminClient: any, userId: string | null) {
  try {
    switch (name) {
      case "search_doctors": {
        const q = (args.query || "").trim();
        if (q) {
          const { data, error } = await supabase.rpc("fuzzy_search_doctors", { q, lim: args.limit || 8 });
          if (error) return { error: error.message };
          const docs = (data || []).map((d: any) => ({
            user_id: d.user_id,
            profiles: { first_name: d.first_name, last_name: d.last_name, avatar_url: d.avatar_url },
            doctor_type: d.doctor_type, bio: d.bio, consultation_fee: d.consultation_fee, rating: d.rating,
          }));
          return {
            doctors: docs,
            query: q,
            suggestion: docs.length === 0
              ? "Sijapata daktari. Jaribu utaalamu (mfano 'moyo', 'watoto', 'ngozi') au tazama madaktari wote."
              : null,
          };
        }
        const { data } = await supabase
          .from("doctor_profiles")
          .select("user_id, doctor_type, bio, consultation_fee, rating, profiles!doctor_profiles_user_id_fkey(first_name,last_name,avatar_url)")
          .eq("is_verified", true).limit(args.limit || 8);
        return { doctors: data || [], query: "" };
      }

      case "search_facilities": {
        let q = supabase
          .from(args.type)
          .select("id, name, address, phone, logo_url, rating, total_reviews")
          .eq("is_verified", true)
          .limit(args.limit || 5);
        if (args.query?.trim()) q = q.ilike("name", `%${args.query}%`);
        const { data } = await q;
        return { items: data || [], type: args.type };
      }

      case "search_medicines": {
        const q = (args.query || "").trim();
        if (!q) return { medicines: [], suggestion: "Andika jina la dawa." };
        const { data, error } = await supabase.rpc("fuzzy_search_medicines", { q, lim: args.limit || 8 });
        if (error) return { error: error.message };
        const meds = (data || []).map((m: any) => ({
          id: m.id, name: m.name, price: m.price, dosage: m.dosage, in_stock: m.in_stock,
          category: m.category, pharmacy_id: m.pharmacy_id,
          pharmacies: { name: m.pharmacy_name },
        }));
        return {
          medicines: meds,
          query: q,
          suggestion: meds.length === 0
            ? `Sijapata "${q}". Jaribu jina la kibiashara (mfano Panadol kwa paracetamol) au ingredient. Au vinjari soko lote.`
            : null,
        };
      }

      case "browse_catalog": {
        let q = supabase
          .from("pharmacy_medicines")
          .select("id, name, price, dosage, in_stock, category, pharmacy_id, pharmacies!inner(name,is_verified)")
          .eq("pharmacies.is_verified", true)
          .order("price", { ascending: true, nullsFirst: false })
          .limit(args.limit || 10);
        if (args.in_stock_only !== false) q = q.eq("in_stock", true);
        if (args.category) q = q.ilike("category", `%${args.category}%`);
        if (args.max_price != null) q = q.lte("price", args.max_price);
        const { data } = await q;
        return { medicines: data || [], filters: args, navigate_hint: "/marketplace" };
      }

      case "list_my_appointments": {
        if (!userId) return { error: "Tafadhali ingia kwanza kupitia 'Mimi'.", needs_login: true };
        const { data } = await supabase
          .from("appointments")
          .select("id, appointment_date, status, symptoms, consultation_type")
          .eq("patient_id", userId).order("appointment_date", { ascending: false }).limit(10);
        return { appointments: data || [], navigate: "/appointments" };
      }

      case "create_appointment_request": {
        if (!userId) return { error: "Mtumiaji hayupo login. Tumia lookup_account + queue_pending_action.", needs_guest_flow: true };
        let doctorId: string | null = null;
        if (args.doctor_name) {
          const { data: docs } = await supabase.rpc("fuzzy_search_doctors", { q: args.doctor_name, lim: 1 });
          doctorId = docs?.[0]?.user_id || null;
        }
        if (!doctorId) return { error: "Sijapata daktari kwa jina hilo. Jaribu search_doctors kwanza." };
        const apptDate = args.appointment_date || new Date(Date.now() + 24 * 3600 * 1000).toISOString();
        const { data, error } = await supabase
          .from("appointments")
          .insert({
            patient_id: userId, doctor_id: doctorId, appointment_date: apptDate,
            symptoms: args.symptoms || null, consultation_type: args.consultation_type || "video", status: "scheduled",
          })
          .select().single();
        if (error) return { error: error.message };
        return { success: true, appointment: data, navigate: "/appointments" };
      }

      case "add_to_cart": {
        if (!userId) return { error: "Mtumiaji hayupo login. Tumia lookup_account + queue_pending_action.", needs_guest_flow: true };
        const { data: meds } = await supabase.rpc("fuzzy_search_medicines", { q: args.medicine_name, lim: 5 });
        let pick: any = (meds || [])[0];
        if (args.pharmacy_name && meds?.length) {
          const pn = String(args.pharmacy_name).toLowerCase();
          pick = meds.find((m: any) => (m.pharmacy_name || "").toLowerCase().includes(pn)) || pick;
        }
        if (!pick) return { error: `Sijapata "${args.medicine_name}". Tumia browse_catalog au search_medicines.` };
        const { error } = await supabase.from("cart_items").upsert(
          { user_id: userId, medicine_id: pick.id, pharmacy_id: pick.pharmacy_id, quantity: args.quantity || 1 },
          { onConflict: "user_id,medicine_id" }
        );
        if (error) return { error: error.message };
        return { success: true, item: { name: pick.name, pharmacy: pick.pharmacy_name, qty: args.quantity || 1 }, navigate: "/cart" };
      }

      case "lookup_account": {
        const { data, error } = await supabase.rpc("lookup_user_by_contact", { contact: args.contact });
        if (error) return { error: error.message };
        const u = (data || [])[0];
        if (!u) return { found: false, contact: args.contact };
        return {
          found: true,
          user: { id: u.id, name: `${u.first_name || ""} ${u.last_name || ""}`.trim(), email: u.email, phone: u.phone },
        };
      }

      case "queue_pending_action": {
        // Resolve user
        const { data: lk } = await supabase.rpc("lookup_user_by_contact", { contact: args.contact });
        const u = (lk || [])[0];
        if (!u) return { error: "Hakuna account na contact hiyo. Mwambie ajisajili." };
        const isEmail = String(args.contact).includes("@");
        const { data, error } = await (adminClient || supabase)
          .from("pending_actions")
          .insert({
            contact: args.contact,
            contact_type: isEmail ? "email" : "phone",
            matched_user_id: u.id,
            action_type: args.action_type,
            payload: args.payload || {},
            human_summary: args.human_summary,
            status: "awaiting_confirmation",
          })
          .select().single();
        if (error) return { error: error.message };
        return {
          success: true,
          pending: data,
          message: `Nimetuma ombi kwa ${u.first_name || "mmiliki"}. Atapata arifa simuni — akikubali, nitatekeleza.`,
        };
      }

      case "list_my_messages": {
        if (!userId) return { error: "Tafadhali ingia kwanza", needs_login: true };
        const { data } = await supabase
          .from("appointments").select("id, doctor_id, patient_id, status")
          .or(`patient_id.eq.${userId},doctor_id.eq.${userId}`).limit(10);
        return { conversations: data || [], navigate: "/messages" };
      }

      case "post_patient_problem": {
        if (!userId) return { error: "Mtumiaji hayupo login.", needs_guest_flow: true };
        const { data, error } = await supabase
          .from("patient_problems")
          .insert({
            patient_id: userId, problem_text: args.problem_text,
            category: args.category || "general", urgency_level: args.urgency_level || "normal",
          })
          .select().single();
        if (error) return { error: error.message };
        return { success: true, problem: data, navigate: "/patient-problems" };
      }

      case "list_medical_records": {
        if (!userId) return { error: "Tafadhali ingia kwanza", needs_login: true };
        const { data } = await supabase
          .from("medical_records").select("id, title, record_type, created_at")
          .eq("patient_id", userId).order("created_at", { ascending: false }).limit(10);
        return { records: data || [], navigate: "/medical-records" };
      }

      case "analyze_symptoms": {
        const s = (args.symptoms || "").toLowerCase();
        let specialty = "general";
        if (/(moyo|kifua|chest|heart)/.test(s)) specialty = "moyo";
        else if (/(kichwa|head|migraine)/.test(s)) specialty = "neva";
        else if (/(tumbo|stomach|kidney|figo)/.test(s)) specialty = "tumbo";
        else if (/(ngozi|skin|rash)/.test(s)) specialty = "ngozi";
        else if (/(mtoto|child|baby)/.test(s)) specialty = "watoto";
        return { suggested_specialty: specialty, advice: "Pendekezo: tafuta daktari wa " + specialty };
      }

      case "emergency_guidance":
        return {
          emergency: true,
          guidance: "🚨 PIGA 112 SASA. Hatua: Damu→bonyeza kitambaa safi; Kuchomwa→maji baridi; Kushindwa kupumua→keti, fungua dirisha; CPR→bonyeza kifua x30, pumua x2.",
          navigate: "/nearby",
        };

      case "navigate_to":
        return { navigate: args.path };

      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e: any) {
    return { error: e.message || "Tool execution failed" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization") || "";

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;

    let userId: string | null = null;
    if (authHeader && !authHeader.includes(SUPABASE_ANON_KEY)) {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id || null;
    } else if (authHeader) {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id || null;
    }

    const conversation: any[] = [
      { role: "system", content: SYSTEM_PROMPT + (userId ? "\n\n[USER STATUS: LOGGED IN]" : "\n\n[USER STATUS: GUEST — usitumie tools zinazohitaji login moja kwa moja; tumia lookup_account + queue_pending_action]") },
      ...messages,
    ];

    const toolResults: any[] = [];

    for (let i = 0; i < 6; i++) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: conversation, tools: TOOLS }),
      });

      if (!response.ok) {
        const t = await response.text();
        return new Response(JSON.stringify({ error: `AI gateway: ${t}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const msg = choice?.message;
      if (!msg) break;

      if (msg.tool_calls?.length) {
        conversation.push(msg);
        for (const tc of msg.tool_calls) {
          let args: any = {};
          try { args = JSON.parse(tc.function.arguments || "{}"); } catch {}
          const result = await executeTool(tc.function.name, args, supabase, adminClient, userId);
          toolResults.push({ tool: tc.function.name, args, result });
          conversation.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
        }
        continue;
      }

      return new Response(
        JSON.stringify({ reply: msg.content || "", results: toolResults }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ reply: "Samahani, tatizo la kiufundi.", results: toolResults }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
