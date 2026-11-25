import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readProjectFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx|ts)$/.test(name) ? [path] : [];
  });
}

describe('shared UI contract', () => {
  it('defines the centralized role capability and navigation policy', () => {
    const authorization = readProjectFile('src/domain/authorization.ts');
    const navigation = readProjectFile('src/app/useAppNavigation.ts');

    expect(authorization).toContain('ROLE_CAPABILITIES');
    expect(authorization).toContain('canRoleOpenScreen');
    expect(authorization).toContain('getRoleScreens');
    expect(navigation).toContain('canRoleOpenScreen');
  });

  it('accepts invitation passwords only inside the trusted functions, after the invitation is accepted', () => {
    const repository = readProjectFile('src/data/invitationRepository.ts');
    expect(repository).not.toContain('updateUser');
    expect(repository).toContain("body: { invitation_id: invitationId, full_name: fullName.trim(), whatsapp_number: whatsappNumber, password }");
    expect(repository).toContain("body: { invitation_id: invitationId, full_name: fullName.trim(), password }");

    for (const [name, rpc] of [['accept-coach-invitation', 'accept_coach_invitation'], ['accept-personalized-invitation', 'accept_personalized_invitation']]) {
      const acceptFunction = readProjectFile(`supabase/functions/${name}/index.ts`);
      expect(acceptFunction.indexOf(`rpc('${rpc}'`)).toBeGreaterThan(-1);
      expect(acceptFunction.indexOf(`rpc('${rpc}'`)).toBeLessThan(acceptFunction.indexOf('auth.admin.updateUserById'));
      expect(acceptFunction).toContain('password_update_failed');
      expect(readProjectFile('supabase/config.toml')).toContain(`[functions.${name}]`);
    }
  });

  it('uses silent tenant refresh after profile branding updates', () => {
    const context = readProjectFile('src/app/tenant/tenantContext.ts');
    const provider = readProjectFile('src/app/tenant/TenantProvider.tsx');
    const profile = readProjectFile('src/screens/coach/CoachProfile.tsx');

    expect(context).toContain('refresh: () => Promise<void>');
    expect(provider).toContain('const refresh = async ()');
    expect(provider).not.toMatch(/const refresh = async[\s\S]*setState\(\{ status: 'loading' \}\)/);
    expect(profile).not.toMatch(/save(Branding|Description)[\s\S]*refreshTenant\(\)/);
  });

  it('does not nest a form inside a ModalShell that already renders one', () => {
    const violations = sourceFiles(resolve(process.cwd(), 'src'))
      .filter((path) => {
        const source = readFileSync(path, 'utf8');
        return /<ModalShell[\s\S]*?\n\s+form\n/.test(source) && /<form[\s>]/.test(source);
      });
    expect(violations).toEqual([]);
  });

  it('does not use native confirmation dialogs', () => {
    const violations = sourceFiles(resolve(process.cwd(), 'src'))
      .filter((path) => !path.includes('sharedUiContract.test.ts'))
      .filter((path) => /window\.confirm|window\.alert|confirm\s*\(/.test(readFileSync(path, 'utf8')));
    expect(violations).toEqual([]);
  });

  it('keeps only the shared UI primitives for common states', () => {
    expect(existsSync(resolve(process.cwd(), 'src/components/CoachStatusToggle.tsx'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'src/components/MemberStatusToggle.tsx'))).toBe(false);
    const appButton = readProjectFile('src/components/AppButton.tsx');
    expect(appButton).toContain('variant');
    expect(appButton).not.toMatch(/text-white|text-zinc-|bg-zinc-|border-zinc-/);
    expect(appButton).toContain('app-button-primary');
    expect(appButton).toContain('app-button-secondary');
    expect(appButton).toContain('app-button-danger');
    expect(appButton).toContain('app-button-ghost');
    expect(readProjectFile('src/components/FeedbackMessage.tsx')).toContain('role');
    expect(readProjectFile('src/components/AppInput.tsx')).toContain('tenant-surface');
    expect(readProjectFile('src/components/AppTextarea.tsx')).toContain('tenant-surface');
    expect(readProjectFile('src/components/AppSelect.tsx')).toContain('tenant-surface');
    expect(existsSync(resolve(process.cwd(), 'src/components/PasswordField.tsx'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'src/components/SelectModalField.tsx'))).toBe(true);
  });

  it('splits routine writes and comments by responsibility', () => {
    expect(existsSync(resolve(process.cwd(), 'src/data/routineAssignmentWriteService.ts'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'src/data/workoutCommentService.ts'))).toBe(true);
    const repository = readProjectFile('src/data/routineAssignmentRepository.ts');
    expect(repository).toContain('routineAssignmentWriteService');
    expect(repository).toContain('workoutCommentService');
  });

  it('keeps coach profile settings split by responsibility', () => {
    expect(existsSync(resolve(process.cwd(), 'src/screens/coach/profile/CoachProfileIdentity.tsx'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'src/screens/coach/profile/CoachWhatsappSettings.tsx'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'src/screens/coach/profile/CoachBrandingSettings.tsx'))).toBe(true);
  });

  it('uses shared empty and loading state components', () => {
    expect(readProjectFile('src/components/EmptyState.tsx')).toContain('role="status"');
    expect(readProjectFile('src/components/LoadingState.tsx')).toContain('role="status"');
  });

  it('splits large coach screens into responsibility components', () => {
    expect(existsSync(resolve(process.cwd(), 'src/screens/coach/profile/CoachProfileIdentity.tsx'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'src/screens/coach/profile/CoachWhatsappSettings.tsx'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'src/screens/coach/profile/CoachBrandingSettings.tsx'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'src/screens/coach/routine/RoutineProgramConfig.tsx'))).toBe(true);
    const routineScreen = readProjectFile('src/screens/coach/CoachProgramRoutine.tsx');
    expect(routineScreen).toContain('<RoutineProgramConfig');
  });

  it('splits large role screens into responsibility sections', () => {
    expect(existsSync(resolve(process.cwd(), 'src/screens/coach/routine/RoutineProgramConfig.tsx'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'src/screens/platform/sections/PlatformTenantsSection.tsx'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'src/screens/student/training/TrainingSetFields.tsx'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'src/screens/coach/workout-history/CoachWorkoutHistoryEntrySummary.tsx'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'src/screens/coach/workout-history/CoachWorkoutHistoryComments.tsx'))).toBe(true);
    expect(readProjectFile('src/screens/coach/CoachProfile.tsx').length).toBeLessThan(20000);
    expect(readProjectFile('src/screens/coach/CoachProgramRoutine.tsx')).toContain('RoutineProgramConfig');
    expect(readProjectFile('src/screens/platform/PlatformEquipmentAdmin.tsx')).toContain('PlatformTenantsSection');
    expect(readProjectFile('src/screens/student/StudentTrainingScreen.tsx')).toContain('TrainingSetFields');
  });

  it('keeps the student WhatsApp action in the header', () => {
    const header = readProjectFile('src/components/Header.tsx');
    const training = readProjectFile('src/screens/student/StudentTrainingScreen.tsx');
    const contact = readProjectFile('src/components/StudentWhatsappContact.tsx');
    const shell = readProjectFile('src/app/AppShell.tsx');

    expect(header).toContain("hasRoleCapability(authState.profile.role, 'contact_assigned_coach')");
    expect(header).toContain('<StudentWhatsappContact />');
    expect(training).toContain('<StudentWhatsappContact />');
    expect(shell).not.toContain('<StudentWhatsappContact');
    expect(contact).toContain('app-button-secondary');
    expect(contact).not.toContain('fixed right-5');
  });

  it('uses the shared modal shell for overlay dialogs', () => {
    const modalShell = readProjectFile('src/components/ModalShell.tsx');
    const statusToggle = readProjectFile('src/components/StatusToggle.tsx');
    const confirmModal = readProjectFile('src/components/ConfirmModal.tsx');

    expect(modalShell).not.toContain('activeModalLocks');
    expect(modalShell).not.toContain('lockedScrollTop');
    expect(modalShell).toContain('touch-none');
    expect(modalShell).toContain('createPortal');
    expect(modalShell).toContain("var(--tenant-surface");
    expect(statusToggle).toContain('ConfirmModal');
    expect(confirmModal).toContain('ModalShell');
  });
});
