import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const jsonResponse = (request: Request, status: number, body: Record<string, unknown>) => {
  const origin = request.headers.get('origin') ?? '';
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin',
    },
  });
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return jsonResponse(request, 204, {});
  if (request.method !== 'POST') return jsonResponse(request, 405, { error: 'method_not_allowed' });

  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return jsonResponse(request, 401, { error: 'authentication_required' });

  let payload: unknown;
  try { payload = await request.json(); } catch { return jsonResponse(request, 400, { error: 'invalid_request' }); }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return jsonResponse(request, 400, { error: 'invalid_request' });

  const body = payload as Record<string, unknown>;
  const action = typeof body.action === 'string' ? body.action : 'provision';
  if (typeof body.tenant_id !== 'string') {
    return jsonResponse(request, 400, { error: 'invalid_request' });
  }
  if (!['list', 'provision', 'resend', 'cancel', 'set_status'].includes(action)) {
    return jsonResponse(request, 400, { error: 'invalid_request' });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
  const tenantId = body.tenant_id;
  const invitationId = typeof body.invitation_id === 'string' ? body.invitation_id : null;

  if (action === 'set_status' && typeof body.coach_id !== 'string') {
    return jsonResponse(request, 400, { error: 'invalid_request' });
  }
  if (action === 'set_status' && body.status !== 'ACTIVE' && body.status !== 'SUSPENDED') {
    return jsonResponse(request, 400, { error: 'invalid_request' });
  }
  if (action === 'provision' && (!email || !fullName)) {
    return jsonResponse(request, 400, { error: 'invalid_request' });
  }
  if ((action === 'resend' || action === 'cancel') && !invitationId && !email) {
    return jsonResponse(request, 400, { error: 'invalid_request' });
  }
  if (action === 'provision' && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || fullName.length < 2 || fullName.length > 120)) {
    return jsonResponse(request, 400, { error: 'invalid_request' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return jsonResponse(request, 500, { error: 'server_not_configured' });

  const authClient = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: callerData, error: callerError } = await authClient.auth.getUser(token);
  if (callerError || !callerData.user) return jsonResponse(request, 401, { error: 'invalid_session' });

  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from('profiles')
    .select('role, status, tenant_id')
    .eq('id', callerData.user.id)
    .maybeSingle();
  if (callerProfileError) return jsonResponse(request, 500, { error: 'profile_verification_failed' });
  if (!callerProfile || callerProfile.role !== 'super_admin' || callerProfile.status !== 'ACTIVE' || callerProfile.tenant_id !== null) {
    return jsonResponse(request, 403, { error: 'super_admin_required' });
  }

  const { data: tenant, error: tenantError } = await adminClient
    .from('tenants')
    .select('id, name, subdomain, status, theme')
    .eq('id', tenantId)
    .maybeSingle();
  if (tenantError) return jsonResponse(request, 500, { error: 'tenant_lookup_failed' });
  if (!tenant || tenant.status !== 'ACTIVE') return jsonResponse(request, 404, { error: 'tenant_not_available' });

  await adminClient.rpc('expire_coach_invitations', {});

  if (action === 'set_status') {
    const { error: statusError } = await adminClient.rpc('set_platform_coach_status', {
      p_actor_id: callerData.user.id,
      p_coach_id: body.coach_id,
      p_status: body.status,
    });
    if (statusError) {
      const code = statusError.message.includes('coach_not_found') ? 'coach_not_found'
        : statusError.message.includes('super_admin_required') ? 'super_admin_required'
        : 'coach_status_update_failed';
      return jsonResponse(request, code === 'coach_not_found' ? 404 : 400, { error: code });
    }
    return jsonResponse(request, 200, { coach_id: body.coach_id, status: body.status });
  }

  if (action === 'list') {
    const [{ data: profiles, error: profilesError }, { data: invitations, error: invitationsError }] = await Promise.all([
      adminClient
        .from('profiles')
        .select('id, tenant_id, role, status, full_name')
        .eq('tenant_id', tenantId)
        .eq('role', 'coach_admin')
        .order('full_name'),
      adminClient
        .from('tenant_invitations')
        .select('id, email, status, created_at, expires_at, accepted_at, auth_user_id, last_sent_at, resend_count')
        .eq('tenant_id', tenantId)
        .eq('invitation_kind', 'coach_admin')
        .order('created_at', { ascending: false }),
    ]);
    if (profilesError || invitationsError) {
      return jsonResponse(request, 500, { error: 'coach_invitation_list_failed' });
    }
    return jsonResponse(request, 200, { coaches: profiles ?? [], invitations: invitations ?? [] });
  }

  if (action === 'resend') {
    const invitationQuery = adminClient
      .from('tenant_invitations')
      .select('id, email, auth_user_id, status, resend_count')
      .eq('tenant_id', tenantId)
      .eq('invitation_kind', 'coach_admin')
      .eq('status', 'PENDING');

    const { data: invitation, error: invitationError } = invitationId
      ? await invitationQuery.eq('id', invitationId).maybeSingle()
      : await invitationQuery.eq('email', email).maybeSingle();

    if (invitationError) return jsonResponse(request, 500, { error: 'invitation_lookup_failed' });
    if (!invitation) return jsonResponse(request, 404, { error: 'invitation_not_pending' });

    const resendBaseUrl = Deno.env.get('COACH_ONBOARDING_REDIRECT_URL')
      ?? Deno.env.get('INVITATION_REDIRECT_URL')
      ?? 'http://ags.localhost:5174/';
    const resendUrl = new URL(resendBaseUrl);
    resendUrl.searchParams.set('invitation_id', invitation.id);
    resendUrl.searchParams.set('invitation_role', 'coach_admin');
    const resendResult = await adminClient.auth.admin.inviteUserByEmail(invitation.email, { redirectTo: resendUrl.toString() });
    if (resendResult.error) {
      return jsonResponse(request, resendResult.error.status === 422 ? 409 : 500, { error: 'coach_invite_failed' });
    }

    const { error: resendUpdateError } = await adminClient
      .from('tenant_invitations')
      .update({
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        last_sent_at: new Date().toISOString(),
        resend_count: (invitation.resend_count ?? 0) + 1,
      })
      .eq('id', invitation.id);
    if (resendUpdateError) return jsonResponse(request, 500, { error: 'invitation_update_failed' });

    return jsonResponse(request, 200, { invitation_id: invitation.id, email: invitation.email });
  }

  if (action === 'cancel') {
    const invitationQuery = adminClient
      .from('tenant_invitations')
      .select('id, auth_user_id, status')
      .eq('tenant_id', tenantId)
      .eq('invitation_kind', 'coach_admin')
      .eq('status', 'PENDING');

    const { data: invitation, error: invitationError } = invitationId
      ? await invitationQuery.eq('id', invitationId).maybeSingle()
      : await invitationQuery.eq('email', email).maybeSingle();

    if (invitationError) return jsonResponse(request, 500, { error: 'invitation_lookup_failed' });
    if (!invitation) return jsonResponse(request, 404, { error: 'invitation_not_pending' });

    if (invitation.auth_user_id) {
      const { data: authUser } = await adminClient.auth.admin.getUserById(invitation.auth_user_id);
      if (authUser?.user && !authUser.user.confirmed_at) {
        await adminClient.auth.admin.deleteUser(invitation.auth_user_id);
      } else {
        await adminClient.from('profiles').update({ status: 'SUSPENDED' }).eq('id', invitation.auth_user_id);
      }
    }

    const { error: cancelError } = await adminClient
      .from('tenant_invitations')
      .update({ status: 'CANCELLED', expires_at: new Date().toISOString(), auth_user_id: null })
      .eq('id', invitation.id);
    if (cancelError) return jsonResponse(request, 500, { error: 'invitation_cancel_failed' });

    return jsonResponse(request, 200, { invitation_id: invitation.id });
  }

  const redirectUrl = Deno.env.get('COACH_ONBOARDING_REDIRECT_URL')
    ?? Deno.env.get('INVITATION_REDIRECT_URL')
    ?? 'http://ags.localhost:5174/';

  const existingInvitation = await adminClient
    .from('tenant_invitations')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .eq('email', email)
    .eq('invitation_kind', 'coach_admin')
    .eq('status', 'PENDING')
    .maybeSingle();
  if (existingInvitation.data) return jsonResponse(request, 409, { error: 'coach_invitation_pending' });

  const theme = tenant.theme as Record<string, unknown> | null;
  const logoUrl = typeof theme?.logoUrl === 'string' ? theme.logoUrl : null;
  const data = {
    full_name: fullName,
    tenant_id: tenant.id,
    role: 'coach_admin',
    gym_name: tenant.name,
    gym_logo_url: logoUrl,
    gym_primary_color: typeof theme?.primaryColor === 'string' ? theme.primaryColor : null,
    gym_secondary_color: typeof theme?.secondaryColor === 'string' ? theme.secondaryColor : null,
    gym_background_color: typeof theme?.backgroundColor === 'string' ? theme.backgroundColor : null,
    gym_accent_color: typeof theme?.accentColor === 'string' ? theme.accentColor : null,
    gym_surface_color: typeof theme?.surfaceColor === 'string' ? theme.surfaceColor : null,
    gym_text_color: typeof theme?.textColor === 'string' ? theme.textColor : null,
    gym_muted_color: typeof theme?.mutedColor === 'string' ? theme.mutedColor : null,
    gym_border_color: typeof theme?.borderColor === 'string' ? theme.borderColor : null,
    gym_body_font: typeof theme?.bodyFont === 'string' ? theme.bodyFont : null,
    gym_display_font: typeof theme?.displayFont === 'string' ? theme.displayFont : null,
  };

  const { data: invitation, error: invitationError } = await adminClient
    .from('tenant_invitations')
    .insert({
      tenant_id: tenant.id,
      email,
      invited_by: callerData.user.id,
      invitation_kind: 'coach_admin',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      last_sent_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (invitationError) {
    return jsonResponse(request, 409, { error: invitationError.message.includes('tenant_invitations_one_pending_email_idx') ? 'coach_invitation_pending' : 'invitation_create_failed' });
  }

  const invitationUrl = new URL(redirectUrl);
  invitationUrl.searchParams.set('invitation_id', invitation.id);
  invitationUrl.searchParams.set('invitation_role', 'coach_admin');

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, { redirectTo: invitationUrl.toString(), data });
  if (inviteError || !invited.user) {
    await adminClient.from('tenant_invitations').update({ status: 'FAILED', expires_at: new Date().toISOString() }).eq('id', invitation.id);
    return jsonResponse(request, inviteError?.status === 422 ? 409 : 500, { error: 'coach_invite_failed' });
  }

  await adminClient
    .from('tenant_invitations')
    .update({ auth_user_id: invited.user.id })
    .eq('id', invitation.id);

  return jsonResponse(request, 200, { user_id: invited.user.id, tenant_id: tenant.id, email, full_name: fullName, invitation_id: invitation.id });
});
