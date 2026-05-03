import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Wewe ni Wizy — msaidizi mahiri wa afya wa TeleMed Tanzania.
Lugha kuu: Kiswahili (jibu kwa Kiingereza tu kama mtumiaji ameandika kwa Kiingereza).

JUKUMU LAKO LINA SEHEMU MBILI:
A) UJUZI WA AFYA: Toa majibu yenye taarifa za kweli, halisi na muhimu kuhusu:
   • Magonjwa: dalili, sababu, matibabu ya awali, kuzuia (mfano malaria, presha, kisukari, UTI, COVID, BP).
   • Dawa: matumizi, kipimo cha kawaida cha mtu mzima, athari, tahadhari (mfano Panadol 1g kila saa 6, Amoxicillin 500mg mara 3 kwa siku).
   • Lishe na mazoezi, afya ya mama na mtoto, afya ya akili, msaada wa kwanza.
   • TOA jibu kamili la elimu — usijificha nyuma ya "muone daktari" PEKEE. Mwishoni shauri aone daktari kama tatizo ni serious.

B) VITENDO KWENYE APP (tools): Mtumiaji akiomba kitu cha kufanya, TUMIA tool MOJA KWA MOJA:
   • "tafuta daktari [...]" / "nataka daktari" → search_doctors (query iwe maelezo aliyotoa, kama hakuna basi query="").
   • "hospitali" / "famasi" / "maabara" / "polyclinics" / "kituo cha karibu" → search_facilities.
   • "miadi yangu" → list_my_appointments. "ujumbe wangu" → list_my_messages. "rekodi zangu" → list_medical_records.
   • "weka miadi"/"book" baada ya kuchagua daktari → create_appointment_request.
   • "nataka [dawa]" / "tafuta dawa" → search_medicines. "ongeza ... cart" → add_to_cart.
   • "ninahisi [dalili]" → kwanza jibu kielimu (uchambuzi wa dalili), kisha tumia analyze_symptoms na pendekeza search_doctors wa specialty husika.
   • Dharura (kupumua shida, kifua kuuma sana, damu nyingi, kupoteza fahamu, kuzimia) → emergency_guidance MARA MOJA, sisitiza 112.
   • "nipeleke [page]" / "fungua [page]" → navigate_to.

KANUNI ZA UANDISHI:
1. USIULIZE swali la ziada kabla ya tool — chukua hatua. Kama unahitaji ufafanuzi, fanya kwanza tool kisha uliza kuongeza filter.
2. Baada ya tool yenye matokeo, andika sentensi 1 tu kufungua matokeo (mfano: "Madaktari 5 nimepata:" au "Hizi ni famasi karibu nawe:") — UI itaonyesha cards. USIANDIKE orodha ndefu kwenye text.
3. Kwa maswali ya elimu safi (bila tool), andika aya 1-2 fupi (sentensi 3-6) — wazi, sahihi, na ya vitendo. Tumia bullets kama kuna hatua.
4. Tafsiri majina ya magonjwa/dawa kwa Kiswahili kama inawezekana (BP = shinikizo la damu, diabetes = kisukari).
5. Kwa user ambaye hajaingia (login) na tool inahitaji session, sema sentensi moja: "Tafadhali ingia kwanza kupitia 'Mimi' kufanya hili."

KAMWE: Usiseme "nipe jina au utaalamu" kabla ya kutafuta. Anza kwa kutafuta, kisha onyesha matokeo na ulize uboresho.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_doctors",
      description: "Tafuta madaktari kwa jina au utaalamu",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Jina au utaalamu, mfano 'moyo'" },
          limit: { type: "number", default: 5 },
        },
      },
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
          query: { type: "string", description: "Sehemu ya jina la kituo (optional)" },
          limit: { type: "number", default: 5 },
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
      description: "Omba/weka miadi na daktari. Unaweza kutumia doctor_id au doctor_name (jina la daktari) — tool itatafuta yenyewe.",
      parameters: {
        type: "object",
        properties: {
          doctor_id: { type: "string" },
          doctor_name: { type: "string", description: "Jina la daktari (kama doctor_id haijulikani)" },
          appointment_date: { type: "string", description: "ISO date-time. Kama haijatolewa, tumia kesho saa 4 asubuhi." },
          symptoms: { type: "string" },
          consultation_type: { type: "string", enum: ["video", "audio", "chat", "in_person"], default: "video" },
        },
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
      description: "Ongeza dawa kwenye cart. Tumia medicine_name (jina la dawa) — tool itatafuta ID yenyewe. Pia inaweza kupokea pharmacy_name kufafanua famasi.",
      parameters: {
        type: "object",
        properties: {
          medicine_id: { type: "string", description: "ID ya dawa kama tayari unajua" },
          medicine_name: { type: "string", description: "Jina la dawa kama Panadol, Amoxicillin" },
          pharmacy_name: { type: "string", description: "Jina la famasi (optional)" },
          quantity: { type: "number", default: 1 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_my_messages",
      description: "Onyesha mazungumzo (chats) ya mtumiaji aliye-login",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "post_patient_problem",
      description: "Pos tatizo la mgonjwa ili madaktari waone na wajibu",
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
      description: "Onyesha rekodi za matibabu za mtumiaji",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_symptoms",
      description: "Pokea dalili za mgonjwa na shauri huduma au utaalamu wa daktari",
      parameters: {
        type: "object",
        properties: { symptoms: { type: "string" } },
        required: ["symptoms"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "emergency_guidance",
      description: "Toa msaada wa first-aid kwa hali ya dharura",
      parameters: {
        type: "object",
        properties: { situation: { type: "string" } },
        required: ["situation"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate_to",
      description: "Pelekea mtumiaji ukurasa fulani",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Mfano /appointments, /doctors-list, /cart, /messages, /medical-records, /nearby, /prescriptions, /notifications",
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
          .select("id, user_id, bio, consultation_fee, doctor_type, experience_years, rating, total_reviews, is_available, profiles!doctor_profiles_user_id_fkey(first_name, last_name, avatar_url), specialties(name)")
          .limit(args.limit || 5);
        if (args.query && args.query.trim()) {
          q = q.or(`doctor_type.ilike.%${args.query}%,bio.ilike.%${args.query}%`);
        }
        const { data } = await q;
        return { doctors: data || [], query: args.query || "" };
      }
      case "search_facilities": {
        let q = supabase
          .from(args.type)
          .select("id, name, address, phone, logo_url, rating, total_reviews")
          .eq("is_verified", true)
          .limit(args.limit || 5);
        if (args.query && args.query.trim()) q = q.ilike("name", `%${args.query}%`);
        const { data } = await q;
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
        return { appointments: data || [], navigate: "/appointments" };
      }
      case "create_appointment_request": {
        if (!userId) return { error: "Tafadhali ingia kwanza kupitia 'Mimi'." };
        let doctorId = args.doctor_id;
        if (!doctorId && args.doctor_name) {
          const name = String(args.doctor_name).trim();
          const parts = name.split(/\s+/);
          const { data: docs } = await supabase
            .from("doctor_profiles")
            .select("user_id, profiles!doctor_profiles_user_id_fkey(first_name,last_name)")
            .limit(20);
          const match = (docs || []).find((d: any) => {
            const fn = (d.profiles?.first_name || "").toLowerCase();
            const ln = (d.profiles?.last_name || "").toLowerCase();
            return parts.every((p) => fn.includes(p.toLowerCase()) || ln.includes(p.toLowerCase()));
          }) || (docs || [])[0];
          doctorId = match?.user_id;
        }
        if (!doctorId) return { error: "Sijapata daktari. Tafadhali taja jina kamili la daktari au chagua kutoka orodha." };
        const apptDate = args.appointment_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from("appointments")
          .insert({
            patient_id: userId,
            doctor_id: doctorId,
            appointment_date: apptDate,
            symptoms: args.symptoms || null,
            consultation_type: args.consultation_type || "video",
            status: "scheduled",
          })
          .select()
          .single();
        if (error) return { error: error.message };
        return { success: true, appointment: data, navigate: "/appointments" };
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
        if (!userId) return { error: "Tafadhali ingia kwanza kupitia 'Mimi'." };
        let medicineId = args.medicine_id;
        let pharmacyId: string | null = null;
        if (!medicineId && args.medicine_name) {
          const { data: meds } = await supabase
            .from("pharmacy_medicines")
            .select("id, pharmacy_id, price, pharmacies!inner(name)")
            .ilike("name", `%${String(args.medicine_name).trim()}%`)
            .eq("in_stock", true)
            .order("price", { ascending: true })
            .limit(10);
          let pick: any = (meds || [])[0];
          if (args.pharmacy_name && meds?.length) {
            const pn = String(args.pharmacy_name).toLowerCase();
            pick = meds.find((m: any) => (m.pharmacies?.name || "").toLowerCase().includes(pn)) || pick;
          }
          if (pick) {
            medicineId = pick.id;
            pharmacyId = pick.pharmacy_id;
          }
        }
        if (!medicineId) return { error: "Sijapata dawa hiyo. Jaribu jina lingine au tembelea Soko la Dawa." };
        if (!pharmacyId) {
          const { data: med } = await supabase
            .from("pharmacy_medicines")
            .select("pharmacy_id")
            .eq("id", medicineId)
            .single();
          pharmacyId = med?.pharmacy_id ?? null;
        }
        if (!pharmacyId) return { error: "Famasi haijapatikana." };
        const { error } = await supabase.from("cart_items").upsert(
          {
            user_id: userId,
            medicine_id: medicineId,
            pharmacy_id: pharmacyId,
            quantity: args.quantity || 1,
          },
          { onConflict: "user_id,medicine_id" }
        );
        if (error) return { error: error.message };
        return { success: true, navigate: "/cart" };
      }
      case "list_my_messages": {
        if (!userId) return { error: "Tafadhali ingia kwanza" };
        const { data } = await supabase
          .from("appointments")
          .select("id, doctor_id, patient_id, status")
          .or(`patient_id.eq.${userId},doctor_id.eq.${userId}`)
          .limit(10);
        return { conversations: data || [], navigate: "/messages" };
      }
      case "post_patient_problem": {
        if (!userId) return { error: "Tafadhali ingia kwanza" };
        const { data, error } = await supabase
          .from("patient_problems")
          .insert({
            patient_id: userId,
            problem_text: args.problem_text,
            category: args.category || "general",
            urgency_level: args.urgency_level || "normal",
          })
          .select()
          .single();
        if (error) return { error: error.message };
        return { success: true, problem: data, navigate: "/patient-problems" };
      }
      case "list_medical_records": {
        if (!userId) return { error: "Tafadhali ingia kwanza" };
        const { data } = await supabase
          .from("medical_records")
          .select("id, title, record_type, created_at")
          .eq("patient_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);
        return { records: data || [], navigate: "/medical-records" };
      }
      case "analyze_symptoms": {
        // Heuristic mapping symptoms → specialty hint
        const s = (args.symptoms || "").toLowerCase();
        let specialty = "general";
        if (/(moyo|kifua|chest|heart)/.test(s)) specialty = "moyo";
        else if (/(kichwa|head|migraine)/.test(s)) specialty = "neva";
        else if (/(tumbo|stomach|kidney|figo)/.test(s)) specialty = "tumbo";
        else if (/(ngozi|skin|rash)/.test(s)) specialty = "ngozi";
        else if (/(mtoto|child|baby)/.test(s)) specialty = "watoto";
        return { suggested_specialty: specialty, advice: "Pendekezo: tafuta daktari wa " + specialty };
      }
      case "emergency_guidance": {
        return {
          emergency: true,
          guidance: "🚨 PIGA 112 SASA. Hatua za haraka:\n• Damu: bonyeza eneo kwa kitambaa safi\n• Kuchomwa: pumzisha kwa maji baridi\n• Kushindwa kupumua: keti, fungua dirisha\n• CPR: bonyeza kifua mara 30, pumua mara 2.",
          navigate: "/nearby",
        };
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

    const navActions: string[] = [];
    const toolResults: any[] = [];

    // Up to 5 tool-call iterations
    for (let i = 0; i < 5; i++) {
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
        return new Response(
          JSON.stringify({
            reply: msg.content || "",
            actions: navActions,
            results: toolResults,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      for (const tc of toolCalls) {
        const fnName = tc.function?.name;
        let args: any = {};
        try {
          args = JSON.parse(tc.function?.arguments || "{}");
        } catch {}
        const result = await executeTool(fnName, args, supabase, userId);
        if (result?.navigate) navActions.push(result.navigate);
        toolResults.push({ tool: fnName, args, result });
        conversation.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }

    return new Response(
      JSON.stringify({ reply: "Samahani, sijaweza kukamilisha ombi.", actions: navActions, results: toolResults }),
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
