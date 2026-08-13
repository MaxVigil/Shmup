import { contentCatalog } from '../content/catalog';
import {
  loadLocale,
  saveLocale,
  translate,
  type Locale,
  type TranslationKey,
  type TranslationParams,
} from '../i18n';

let locale: Locale = loadLocale(window.localStorage);

export function getLocale(): Locale {
  return locale;
}

export function setLocale(nextLocale: Locale): void {
  locale = nextLocale;
  saveLocale(window.localStorage, nextLocale);
}

export function t(key: TranslationKey, params: TranslationParams = {}): string {
  return translate(locale, key, params);
}

export function localizedWeaponName(weaponId: string | null): string {
  if (weaponId === null) {
    return t('loadout.slotEmpty');
  }
  if (weaponId === contentCatalog.weapons[1].id) {
    return t('content.impulseAccelerator');
  }
  if (weaponId === contentCatalog.weapons[2].id) {
    return t('content.splitPulse');
  }
  if (weaponId === contentCatalog.weapons[3].id) {
    return t('content.canisterCannon');
  }
  if (weaponId === contentCatalog.weapons[4].id) {
    return t('content.rocketPod');
  }
  return t('content.standardCannon');
}
