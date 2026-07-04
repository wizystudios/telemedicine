import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userRes, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const uid = userRes.user.id;

    // Best-effort snapshot of every table that stores this user's data.
    const tables: [string, string][] = [
      ['profiles', 'id'],
      ['patient_profiles', 'user_id'],
      ['doctor_profiles', 'user_id'],
      ['user_roles', 'user_id'],
      ['appointments', 'patient_id'],
      ['appointments_as_doctor:appointments', 'doctor_id'],
      ['prescriptions', 'patient_id'],
      ['medical_records', 'patient_id'],
      ['pharmacy_orders', 'patient_id'],
      ['lab_bookings', 'patient_id'],
      ['reviews', 'patient_id'],
      ['saved_doctors', 'user_id'],
      ['notifications', 'user_id'],
      ['chat_messages', 'sender_id'],
      ['patient_problems', 'patient_id'],
      ['cart_items', 'user_id'],
      ['medication_reminders', 'user_id'],
      ['chatbot_conversations', 'user_id'],
      ['cookie_consents', 'user_id'],
      ['account_deletion_requests', 'user_id'],
    ];

    const bundle: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      user: {
        id: uid,
        email: userRes.user.email,
        phone: userRes.user.phone,
        created_at: userRes.user.created_at,
        metadata: userRes.user.user_metadata,
      },
    };

    for (const [key, col] of tables) {
      const [alias, real] = key.includes(':') ? key.split(':') : [key, key];
      try {
        const { data } = await admin.from(real).select('*').eq(col, uid);
        bundle[alias] = data ?? [];
      } catch (_e) {
        bundle[alias] = [];
      }
    }

    return new Response(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="my-data-${uid}.json"`,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
