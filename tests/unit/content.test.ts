import { describe, expect, it } from 'vitest';
import { contentCatalog } from '../../src/content/catalog';
import type { ContentCatalog } from '../../src/content/model';
import { validateContentCatalog } from '../../src/content/validate';

describe('validateContentCatalog', () => {
  it('accepts the shipped foundation catalogue', () => {
    expect(() => validateContentCatalog(contentCatalog)).not.toThrow();
  });

  it('rejects duplicate identifiers', () => {
    const invalidCatalog: ContentCatalog = {
      ...contentCatalog,
      weapons: [contentCatalog.weapons[0], contentCatalog.weapons[0]],
    };

    expect(() => validateContentCatalog(invalidCatalog)).toThrow(
      'weapons contains duplicate id',
    );
  });

  it('rejects enemies with non-positive combat values', () => {
    const invalidCatalog: ContentCatalog = {
      ...contentCatalog,
      enemies: [{ ...contentCatalog.enemies[0], armour: 0 }],
    };

    expect(() => validateContentCatalog(invalidCatalog)).toThrow(
      'Enemy enemy-scout must have positive combat values',
    );
  });
});
