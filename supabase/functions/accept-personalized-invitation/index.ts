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

function acceptanceError(error: string): { status: number; code: string } {
  if (error.includes('invalid_full_name')) return { status: 400, code: 'invalid_full_name' };
  if (error.includes('invite_email_mismatch')) return { status: 403, code: 'invite_email_mismatch' };
  if (error.includes('tenant_inactive')) return { status: 403, code: 'gym_not_active' };
  if (error.includes('inviter_not_eligible')) return { status: 403, code: 'coach_not_active' };
  if (error.includes('invitation_expired')) return { status: 410, code: 'invitation_expired' };
  if (error.includes('capacity_reached')) return { status: 409, code: 'gym_member_limit_reached' };
  if (error.includes('account_not_eligible')) return { status: 409, code: 'account_not_eligible' };
  if (error.includes('invitation_not_pending')) return { status: 409, code: 'invitation_not_pending' };
  if (error.includes('invitation_not_found')) return { status: 404, code: 'invitation_not_found' };
  return { status: 500, code: 'invitation_acceptance_failed' };
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
    Object.keys(body).some((key) => key !== 'invitation_id' && key !== 'full_name')
    || typeof body.invitation_id !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.invitation_id)
    || typeof body.full_name !== 'string'
    || body.full_name.trim().length < 2
    || body.full_name.trim().length > 120
  ) {
    return jsonResponse(request, 400, { error: 'invalid_request' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Invitation acceptance function is missing Supabase server configuration.');
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

  const { error } = await adminClient.rpc('accept_personalized_invitation', {
    p_invitation_id: body.invitation_id,
    p_auth_user_id: userData.user.id,
    p_full_name: body.full_name.trim(),
  });

  if (error) {
    const mapped = acceptanceError(error.message);
    return jsonResponse(request, mapped.status, { error: mapped.code });
  }

  return jsonResponse(request, 200, { status: 'accepted' });
});