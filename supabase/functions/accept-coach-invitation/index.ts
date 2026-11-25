import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://ags.localhost:5173',
  'http://localhost:5174',
  'http://ags.localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://ags-roan-iota.vercel.app',
];

const allowedOrigins = new Set(
  (Deno.env.get('INVITATION_ALLOWED_ORIGINS') ?? DEFAULT_ALLOWED_ORIGINS.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function jsonResponse(request: Request, status: number, body: Record<string, unknown>) {
  const headers = new Headers({ 'Content-Type': 'application/json', 'Vary': 'Origin' });
  const origin = request.headers.get('origin');
  if (origin && (allowedOrigins.has(origin) || /^https:\/\/[^.]+\.tugimnasioapp\.com$/.test(origin))) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Headers', 'authorization, apikey, x-client-info, content-type');
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  if (origin && !allowedOrigins.has(origin) && !/^https:\/\/[^.]+\.tugimnasioapp\.com$/.test(origin)) {
    return jsonResponse(request, 403, { error: 'origin_not_allowed' });
  }
  if (request.method === 'OPTIONS') return jsonResponse(request, 204, {});
  if (request.method !== 'POST') return jsonResponse(request, 405, { error: 'method_not_allowed' });

  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return jsonResponse(request, 401, { error: 'authentication_required' });

  let payload: unknown;
  try { payload = await request.json(); } catch { return jsonResponse(request, 400, { error: 'invalid_request' }); }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return jsonResponse(request, 400, { error: 'invalid_request' });
  }

  const body = payload as Record<string, unknown>;
  if (
    typeof body.invitation_id !== 'string'
    || typeof body.full_name !== 'string'
    || body.full_name.trim().length < 2
    || body.full_name.trim().length > 120
    || typeof body.whatsapp_number !== 'string'
    || !/^573[0-9]{9}$/.test(body.whatsapp_number.trim())
    || typeof body.password !== 'string'
    || body.password.length < 10
  ) {
    return jsonResponse(request, 400, { error: 'invalid_request' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(request, 500, { error: 'server_not_configured' });
  }

  const authClient = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) return jsonResponse(request, 401, { error: 'invalid_session' });

  const { error } = await adminClient.rpc('accept_coach_invitation', {
    p_invitation_id: body.invitation_id,
    p_auth_user_id: userData.user.id,
    p_full_name: body.full_name.trim(),
    p_whatsapp_number: body.whatsapp_number.trim(),
  });

  if (error) {
    const code = error.message.includes('invitation_expired') ? 'invitation_expired'
      : error.message.includes('invite_email_mismatch') ? 'invite_email_mismatch'
      : error.message.includes('tenant_inactive') ? 'gym_not_active'
      : error.message.includes('inviter_not_eligible') ? 'coach_not_active'
      : error.message.includes('account_not_eligible') ? 'account_not_eligible'
      : error.message.includes('invitation_not_pending') ? 'invitation_not_pending'
      : 'invitation_acceptance_failed';
    const status = code === 'invitation_expired' ? 410 : code === 'invitation_not_pending' ? 409 : code === 'invite_email_mismatch' ? 403 : 400;
    return jsonResponse(request, status, { error: code });
  }

  // La contraseña va al final: un rechazo de la invitación no debe invalidar la sesión del enlace.
  const { error: passwordError } = await adminClient.auth.admin.updateUserById(userData.user.id, {
    password: body.password,
  });
  if (passwordError) {
    return jsonResponse(request, 500, { error: 'password_update_failed' });
  }

  return jsonResponse(request, 200, { status: 'accepted', role: 'coach_admin' });
});
