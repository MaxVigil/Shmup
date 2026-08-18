import { describe, expect, it } from 'vitest';
import { buildEntitiesMarkdown } from '../../scripts/export-entities.mjs';

describe('entities documentation', () => {
  it('matches the committed docs/ENTITIES.md (run npm run entities after content changes)', () => {
    const committed = Object.values(
      import.meta.glob('../../docs/ENTITIES.md', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>,
    )[0] ?? '';
    expect(buildEntitiesMarkdown()).toBe(committed);
  });
});
