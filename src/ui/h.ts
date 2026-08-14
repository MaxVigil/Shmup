/**
 * Tiny typed DOM builder used by the presentation layer.
 *
 * Keeps dynamic markup declarative without introducing a framework
 * dependency, and gives the render functions one consistent way to
 * construct elements, classes, and ARIA attributes.
 *
 * Usage:
 *   const card = h('article', { class: 'market-card' },
 *     h('strong', null, name),
 *     h('button', { class: 'base-action is-primary', type: 'button' }, 'BUY · 420'),
 *   );
 */

export type Child = string | number | Node | null | undefined;

export interface ElementAttrs {
  readonly class?: string;
  readonly id?: string;
  readonly type?: string;
  readonly hidden?: boolean;
  readonly role?: string;
  readonly scope?: string;
  readonly colspan?: number;
  readonly value?: string;
  readonly title?: string;
  readonly style?: string;
  readonly disabled?: boolean;
  readonly 'aria-label'?: string;
  readonly 'aria-live'?: string;
  readonly 'aria-controls'?: string;
  readonly 'aria-selected'?: string;
  readonly 'aria-expanded'?: string;
  readonly 'aria-keyshortcuts'?: string;
  readonly 'data-base-section'?: string;
  readonly 'data-nav-glyph'?: string;
  readonly dataTheme?: string;
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: ElementAttrs | null,
  ...children: readonly Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (attrs !== null) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) {
        continue;
      }
      if (key === 'class') {
        element.className = String(value);
      } else if (value === true) {
        element.setAttribute(key, '');
      } else {
        element.setAttribute(key, String(value));
      }
    }
  }
  for (const child of children) {
    if (child === null || child === undefined) {
      continue;
    }
    if (child instanceof Node) {
      element.append(child);
    } else {
      element.append(document.createTextNode(String(child)));
    }
  }
  return element;
}

/** Appends all children into a container and returns the container. */
export function fill(container: HTMLElement, ...children: readonly Child[]): HTMLElement {
  for (const child of children) {
    if (child === null || child === undefined) {
      continue;
    }
    if (child instanceof Node) {
      container.append(child);
    } else {
      container.append(document.createTextNode(String(child)));
    }
  }
  return container;
}
