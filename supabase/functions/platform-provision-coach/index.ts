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
  if (typeof body.email !== 'string' || typeof body.full_name !== 'string' || typeof body.tenant_id !== 'string') {
    return jsonResponse(request, 400, { error: 'invalid_request' });
  }

  const email = body.email.trim().toLowerCase();
  const fullName = body.full_name.trim();
  const tenantId = body.tenant_id;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || fullName.length < 2 || fullName.length > 120) {
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

  const redirectUrl = Deno.env.get('COACH_ONBOARDING_REDIRECT_URL')
    ?? Deno.env.get('INVITATION_REDIRECT_URL')
    ?? 'http://ags.localhost:5174/';

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

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirectUrl,
    data,
  });
  if (inviteError || !invited.user) {
    return jsonResponse(request, inviteError?.status === 422 ? 409 : 500, { error: 'coach_invite_failed' });
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({ id: invited.user.id, tenant_id: tenant.id, role: 'coach_admin', status: 'ACTIVE', full_name: fullName });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(invited.user.id);
    return jsonResponse(request, 500, { error: 'coach_profile_failed' });
  }

  return jsonResponse(request, 200, { user_id: invited.user.id, tenant_id: tenant.id, email, full_name: fullName });
});
