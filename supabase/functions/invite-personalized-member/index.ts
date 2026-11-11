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

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function reservationErrorStatus(message: string): number {
  if (message.includes('invalid_email')) return 400;
  if (message.includes('not_authorized')) return 403;
  if (message.includes('capacity_reached') || message.includes('already_member')) return 409;
  if (message.includes('tenant_inactive')) return 403;
  return 500;
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  if (origin && !allowedOrigins.has(origin)) {
    return jsonResponse(request, 403, { error: 'origin_not_allowed' });
  }

  if (request.method === 'OPTIONS') {
    return jsonResponse(request, 204, {});
  }
  if (request.method !== 'POST') {
    return jsonResponse(request, 405, { error: 'method_not_allowed' });
  }

  const authorization = request.headers.get('authorization');
  const tokenMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) {
    return jsonResponse(request, 401, { error: 'authentication_required' });
  }

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
  if (Object.keys(body).some((key) => key !== 'email') || typeof body.email !== 'string') {
    return jsonResponse(request, 400, { error: 'email_required' });
  }

  const email = body.email.trim().toLowerCase();
  if (email.length > 254 || !emailPattern.test(email)) {
    return jsonResponse(request, 400, { error: 'invalid_email' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Invitation function is missing Supabase server configuration.');
    return jsonResponse(request, 500, { error: 'server_not_configured' });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await authClient.auth.getUser(tokenMatch[1]);
  if (userError || !userData.user) {
    return jsonResponse(request, 401, { error: 'invalid_session' });
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, tenant_id, role, status')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Could not load inviter profile.');
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

  const { data: invitationId, error: prepareError } = await adminClient.rpc(
    'prepare_personalized_invitation',
    {
      p_tenant_id: profile.tenant_id,
      p_actor_id: userData.user.id,
      p_email: email,
    }
  );

  if (prepareError || typeof invitationId !== 'string') {
    const message = prepareError?.message ?? 'invitation_preparation_failed';
    return jsonResponse(request, reservationErrorStatus(message), {
      error: message.includes('capacity_reached')
        ? 'gym_member_limit_reached'
        : message.includes('already_member')
          ? 'member_already_exists'
          : message.includes('tenant_inactive')
            ? 'gym_not_active'
            : message.includes('not_authorized')
              ? 'coach_access_required'
              : 'invitation_preparation_failed',
    });
  }

  const { data: invitation, error: invitationError } = await adminClient
    .from('tenant_invitations')
    .select('id, auth_user_id, status')
    .eq('id', invitationId)
    .single();

  if (invitationError || !invitation || invitation.status !== 'PENDING') {
    console.error('Could not load prepared invitation.');
    return jsonResponse(request, 500, { error: 'invitation_preparation_failed' });
  }

  const redirectBase = Deno.env.get('INVITATION_REDIRECT_URL')
    ?? 'http://ags.localhost:5174/';
  let redirectTo: string;
  try {
    const redirectUrl = new URL(redirectBase);
    redirectUrl.searchParams.set('invitation_id', invitationId);
    redirectTo = redirectUrl.toString();
  } catch {
    console.error('Invitation redirect URL is invalid.');
    return jsonResponse(request, 500, { error: 'server_not_configured' });
  }

  if (invitation.auth_user_id) {
    const { error: resendError } = await authClient.auth.resetPasswordForEmail(email, { redirectTo });
    if (resendError) {
      console.error('Could not resend personalized member access email.');
      return jsonResponse(request, 502, { error: 'invitation_email_failed' });
    }
    return jsonResponse(request, 200, { invitation_id: invitationId, status: 'resent' });
  }

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    { redirectTo }
  );

  if (inviteError || !inviteData.user) {
    if (!inviteData.user) {
      const { error: failError } = await adminClient.rpc('fail_personalized_invitation', {
        p_invitation_id: invitationId,
      });
      if (failError) console.error('Could not release failed invitation allocation.');
    }
    console.error('Could not send personalized member invitation.');
    return jsonResponse(request, 502, { error: 'invitation_email_failed' });
  }

  const { error: linkError } = await adminClient.rpc('link_personalized_invitation', {
    p_invitation_id: invitationId,
    p_auth_user_id: inviteData.user.id,
  });

  if (linkError) {
    console.error('Auth invite was sent but its identity could not be linked.');
    return jsonResponse(request, 502, { error: 'invitation_link_failed' });
  }

  return jsonResponse(request, 201, { invitation_id: invitationId, status: 'sent' });
});