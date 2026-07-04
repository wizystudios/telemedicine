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

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: userRes, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const uid = userRes.user.id;

    const body = await req.json().catch(() => ({}));
    const action = body?.action ?? 'request';
    const reason = body?.reason ?? null;

    if (action === 'cancel') {
      const { error } = await admin
        .from('account_deletion_requests')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('user_id', uid)
        .eq('status', 'pending');
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, cancelled: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'immediate') {
      // Hard delete now (irreversible). Cascades via auth.users FKs.
      const { error } = await admin.auth.admin.deleteUser(uid);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, deleted: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default: schedule with 30-day grace
    const scheduled_for = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await admin
      .from('account_deletion_requests')
      .upsert({
        user_id: uid,
        status: 'pending',
        reason,
        scheduled_for,
        requested_at: new Date().toISOString(),
        cancelled_at: null,
      }, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, request: data }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
