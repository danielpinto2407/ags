import { readFileSync, readdirSync, statSync } from 'node:fs';
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

  it('uses the shared modal shell for overlay dialogs', () => {
    const modalShell = readProjectFile('src/components/ModalShell.tsx');
    const statusToggle = readProjectFile('src/components/StatusToggle.tsx');
    const confirmModal = readProjectFile('src/components/ConfirmModal.tsx');

    expect(modalShell).toContain('createPortal');
    expect(modalShell).toContain("var(--tenant-surface");
    expect(statusToggle).toContain('ModalShell');
    expect(confirmModal).toContain('ModalShell');
  });
});
