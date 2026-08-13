import { describe, expect, it } from 'vitest';
import appShellSource from '../../src/ui/app-shell.ts?raw';
import templateSource from '../../src/ui/template.ts?raw';

describe('UI template id integrity', () => {
  const referenced = new Set<string>();
  const pattern = /\b(?:byId|setText)\(\s*'([a-zA-Z0-9-]+)'/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(appShellSource)) !== null) {
    referenced.add(match[1] as string);
  }

  const templateIds = new Set<string>();
  const idPattern = /id="([a-zA-Z0-9-]+)"/g;
  while ((match = idPattern.exec(templateSource)) !== null) {
    templateIds.add(match[1] as string);
  }

  it('resolves every byId/setText id to an element in the app template', () => {
    const missing = [...referenced].filter((id) => !templateIds.has(id));
    expect(missing).toEqual([]);
  });

  it('does not reference legacy loadout labels that were removed', () => {
    expect(referenced.has('weapon-slot-1-label')).toBe(false);
    expect(referenced.has('weapon-standard-role')).toBe(false);
  });
});
