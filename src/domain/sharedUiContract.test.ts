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
  it('does not use native confirmation dialogs', () => {
    const violations = sourceFiles(resolve(process.cwd(), 'src'))
      .filter((path) => !path.includes('sharedUiContract.test.ts'))
      .filter((path) => /window\.confirm|window\.alert|confirm\s*\(/.test(readFileSync(path, 'utf8')));
    expect(violations).toEqual([]);
  });

  it('keeps only the shared UI primitives for common states', () => {
    expect(existsSync(resolve(process.cwd(), 'src/components/CoachStatusToggle.tsx'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'src/components/MemberStatusToggle.tsx'))).toBe(false);
    expect(readProjectFile('src/components/AppButton.tsx')).toContain('variant');
    expect(readProjectFile('src/components/FeedbackMessage.tsx')).toContain('role');
    expect(readProjectFile('src/components/AppInput.tsx')).toContain('tenant-surface');
    expect(readProjectFile('src/components/AppTextarea.tsx')).toContain('tenant-surface');
    expect(readProjectFile('src/components/AppSelect.tsx')).toContain('tenant-surface');
    expect(existsSync(resolve(process.cwd(), 'src/components/PasswordField.tsx'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'src/components/SelectModalField.tsx'))).toBe(true);
  });

  it('uses shared empty and loading state components', () => {
    expect(readProjectFile('src/components/EmptyState.tsx')).toContain('role="status"');
    expect(readProjectFile('src/components/LoadingState.tsx')).toContain('role="status"');
  });

  it('uses the shared modal shell for overlay dialogs', () => {
    const modalShell = readProjectFile('src/components/ModalShell.tsx');
    const statusToggle = readProjectFile('src/components/StatusToggle.tsx');
    const confirmModal = readProjectFile('src/components/ConfirmModal.tsx');

    expect(modalShell).toContain('activeModalLocks');
    expect(modalShell).toContain('lockedScrollTop');
    expect(modalShell).toContain('lockedScrollLeft');
    expect(modalShell).toContain('lockedBodyOverflowY');
    expect(modalShell).toContain('onCloseRef');
    expect(modalShell).toContain('createPortal');
    expect(modalShell).toContain("var(--tenant-surface");
    expect(statusToggle).toContain('ConfirmModal');
    expect(confirmModal).toContain('ModalShell');
  });
});
