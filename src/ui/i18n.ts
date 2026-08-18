import { weaponId } from '../content/ids';
import {
  loadLocale,
  saveLocale,
  translate,
  type Locale,
  type TranslationKey,
  type TranslationParams,
} from '../i18n';
import { formatCredits } from './credits';

let locale: Locale = loadLocale(window.localStorage);

export function getLocale(): Locale {
  return locale;
}

export function setLocale(nextLocale: Locale): void {
  locale = nextLocale;
  saveLocale(window.localStorage, nextLocale);
}

const CREDIT_PARAMS = new Set(['credits', 'principal', 'repayment', 'bounty']);

export function t(key: TranslationKey, params: TranslationParams = {}): string {
  const formatted: Record<string, string | number> = { ...params };
  for (const moneyKey of CREDIT_PARAMS) {
    const value = formatted[moneyKey];
    if (typeof value === 'number') {
      formatted[moneyKey] = formatCredits(value);
    }
  }
  return translate(locale, key, formatted);
}

export function localizedWeaponName(id: string | null): string {
  if (id === null) {
    return t('loadout.slotEmpty');
  }
  if (id === weaponId.impulseAccelerator) {
    return t('content.impulseAccelerator');
  }
  if (id === weaponId.splitPulse) {
    return t('content.splitPulse');
  }
  if (id === weaponId.canisterCannon) {
    return t('content.canisterCannon');
  }
  if (id === weaponId.rocketPod) {
    return t('content.rocketPod');
  }
  if (id === weaponId.disintegrationLance) {
    return t('content.disintegrationLance');
  }
  if (id === weaponId.plasmaOrbProjector) {
    return t('content.plasmaOrbProjector');
  }
  if (id === weaponId.singularityProjector) {
    return t('content.singularityProjector');
  }
  return t('content.standardCannon');
}
