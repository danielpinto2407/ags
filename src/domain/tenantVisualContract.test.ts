import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('tenant visual contract', () => {
  it('uses the same tenant primary action for login and password recovery', () => {
    const login = readProjectFile('src/screens/LoginScreen.tsx');
    const recovery = readProjectFile('src/screens/PasswordRecoveryScreen.tsx');

    expect(login).toContain("import AppButton from '@/components/AppButton'");
    expect(login).toContain('variant="primary"');
    expect(recovery).toContain("import AppButton from '@/components/AppButton'");
    expect(recovery).toContain('variant="primary"');
    const tailwind = readProjectFile('tailwind.config.js');
    expect(tailwind).toContain("500: 'var(--tenant-primary,");
    expect(tailwind).toContain("600: 'var(--tenant-secondary,");
  });

  it('derives contrasted and interactive tenant variables for shared controls', () => {
    const tenant = readProjectFile('src/domain/tenant.ts');
    const appButtonStyles = readProjectFile('src/index.css');

    expect(tenant).toContain('getTenantThemeCssVariables');
    expect(tenant).toContain('--tenant-on-primary');
    expect(tenant).toContain('--tenant-primary-hover');
    expect(tenant).toContain('--tenant-control-hover');
    expect(appButtonStyles).toContain('.app-button-primary');
    expect(appButtonStyles).toContain('var(--tenant-on-primary');
  });

  it('keeps auth email layouts and tenant color fallbacks in sync', () => {
    const invitation = readProjectFile('supabase/templates/invite.html');
    const recovery = readProjectFile('supabase/templates/recovery.html');
    const styles = (template: string) => [...template.matchAll(/style="([^"]*)"/g)].map((match) => match[1]);

    expect(styles(invitation).length).toBeGreaterThan(0);
    expect(styles(recovery).length).toBeGreaterThan(0);
    for (const field of ['gym_logo_url', 'gym_name', 'gym_primary_color', 'gym_background_color', 'gym_surface_color', 'gym_text_color', 'gym_muted_color', 'gym_border_color', 'gym_body_font', 'gym_display_font']) {
      expect(invitation).toContain(`.Data.${field}`);
      expect(recovery).toContain(`.Data.${field}`);
    }
    expect(invitation).toContain('{{ .ConfirmationURL }}');
    expect(recovery).toContain('{{ .ConfirmationURL }}');
  });
});