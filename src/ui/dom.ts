import { t } from './i18n';
import type { TranslationKey, TranslationParams } from '../i18n';

export function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Required UI element #${id} was not found.`);
  }
  return element as T;
}

export function setText(
  id: string,
  key: TranslationKey,
  params: TranslationParams = {},
): void {
  byId<HTMLElement>(id).textContent = t(key, params);
}
