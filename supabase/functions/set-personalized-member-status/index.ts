import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://ags.localhost:5173',
  'http://localhost:5174',
  'http://ags.localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

const allowedOrigins = new Set(
  (Deno.env.get('INVITATION_ALLOWED_ORIGINS') ?? DEFAULT_ALLOWED_ORIGINS.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

function jsonResponse(request: Request, status: number, body: Record<string, unknown>) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  });
  const origin = request.headers.get('origin');

  if (origin && allowedOrigins.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Headers', 'authorization, apikey, x-client-info, content-type');
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }

  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

function statusError(message: string): { status: number; code: string } {
  if (message.includes('not_authorized') || message.includes('member_not_owned')) {
    return { status: 403, code: 'member_access_required' };
  }
  if (message.includes('tenant_inactive')) return { status: 403, code: 'gym_not_active' };
  return { status: 500, code: 'member_status_update_failed' };
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  if (origin && !allowedOrigins.has(origin)) {
    return jsonResponse(request, 403, { error: 'origin_not_allowed' });
  }

  if (request.method === 'OPTIONS') return jsonResponse(request, 204, {});
  if (request.method !== 'POST') return jsonResponse(request, 405, { error: 'method_not_allowed' });

  const tokenMatch = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) return jsonResponse(request, 401, { error: 'authentication_required' });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(request, 400, { error: 'invalid_request' });
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return jsonResponse(request, 400, { error: 'invalid_request' });
  }

  const body = payload as Record<string, unknown>;
  if (
    Object.keys(body).some((key) => key !== 'member_id' && key !== 'status')
    || typeof body.member_id !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.member_id)
    || (body.status !== 'ACTIVE' && body.status !== 'INACTIVE')
  ) {
    return jsonResponse(request, 400, { error: 'invalid_request' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Member status function is missing Supabase server configuration.');
    return jsonResponse(request, 500, { error: 'server_not_configured' });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await authClient.auth.getUser(tokenMatch[1]);
  if (userError || !userData.user) return jsonResponse(request, 401, { error: 'invalid_session' });

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, tenant_id, role, status')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Could not load coach profile for member status update.');
    return jsonResponse(request, 500, { error: 'profile_verification_failed' });
  }
  if (
    !profile
    || profile.status !== 'ACTIVE'
    || profile.role !== 'coach_admin'
    || typeof profile.tenant_id !== 'string'
  ) {
    return jsonResponse(request, 403, { error: 'coach_access_required' });
  }

  const { error } = await adminClient.rpc('set_personalized_member_status', {
    p_tenant_id: profile.tenant_id,
    p_actor_id: userData.user.id,
    p_member_id: body.member_id,
    p_status: body.status,
  });

  if (error) {
    const mapped = statusError(error.message);
    return jsonResponse(request, mapped.status, { error: mapped.code });
  }

  return jsonResponse(request, 200, { status: body.status === 'ACTIVE' ? 'active' : 'inactive' });
});