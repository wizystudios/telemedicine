import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symptoms } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Wewe ni msaidizi wa afya wa AI kwa TeleMed Tanzania. Chamba dalili zilizopewa na toa:
1. Uchambuzi mfupi wa hali inayoweza kuwa (kwa Kiswahili)
2. Daktari wa aina gani anapaswa kushauriwa
3. Kama ni dharura au la

MAJIBU LAZIMA yawe kwa Kiswahili.
Kama dalili zinaonyesha dharura (mfano: maumivu makali ya kifua, kupoteza fahamu, damu nyingi), sema wazi na toa ushauri wa kwenda hospitali haraka.

Format ya jibu:
{
  "analysis": "Maelezo ya hali inayoweza kuwa...",
  "specialists": [{"name": "Jina la Daktari/Aina", "specialty": "Utaalamu"}],
  "isEmergency": true/false,
  "urgency": "low/medium/high/emergency"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Dalili: ${symptoms}` }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      result = {
        analysis: content || 'Samahani, sijaweza kuchambua dalili zako vizuri. Tafadhali wasiliana na daktari.',
        specialists: [{ name: 'Daktari wa Jumla', specialty: 'General Practice' }],
        isEmergency: false,
        urgency: 'medium'
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Symptom checker error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      analysis: 'Samahani, kuna tatizo la mfumo. Tafadhali jaribu tena au wasiliana na daktari.',
      specialists: [],
      isEmergency: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
