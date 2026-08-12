import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  loadLocale,
  LOCALE_STORAGE_KEY,
  saveLocale,
  translate,
  type LocaleStorage,
} from '../../src/i18n';

function memoryStorage(initial?: string): LocaleStorage & { value: string | null } {
  return {
    value: initial ?? null,
    getItem() {
      return this.value;
    },
    setItem(_key, value) {
      this.value = value;
    },
  };
}

describe('localization', () => {
  it('defaults to Ukrainian and ignores invalid stored values', () => {
    expect(loadLocale(memoryStorage())).toBe(DEFAULT_LOCALE);
    expect(loadLocale(memoryStorage('de'))).toBe('uk');
  });

  it('persists a supported locale', () => {
    const storage = memoryStorage();
    saveLocale(storage, 'en');

    expect(storage.value).toBe('en');
    expect(LOCALE_STORAGE_KEY).toBe('shmup.locale');
  });

  it('translates and interpolates both languages', () => {
    expect(translate('uk', 'combat.armour', { value: '075' })).toBe('БРОНЯ 075');
    expect(translate('en', 'combat.armour', { value: '075' })).toBe('ARMOUR 075');
    expect(translate('uk', 'objective.hireEngineer', {})).toBe(
      'Найміть провідного інженера',
    );
    expect(translate('en', 'upgrade.researched', {})).toContain('blueprint');
  });

  it('translates the Chinese locale', () => {
    expect(translate('zh', 'base.title', {})).toBe('国际回收总局');
    expect(translate('zh', 'combat.armour', { value: '075' })).toBe('装甲 075');
    expect(translate('zh', 'baseNav.hangar', {})).toBe('机库');
  });
});
