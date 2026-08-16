/**
 * Material-style ink ripple for `.base-action` buttons.
 * One delegated `pointerdown` listener covers every standard button in the app;
 * the ripple is suppressed under `prefers-reduced-motion`.
 */

const RIPPLE_CLASS = 'base-action__ripple';

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function spawnRipple(button: HTMLElement, event: PointerEvent): void {
  const rect = button.getBoundingClientRect();
  const diameter = Math.max(rect.width, rect.height) * 2;
  const radius = diameter / 2;
  const ripple = document.createElement('span');
  ripple.className = RIPPLE_CLASS;
  ripple.style.width = `${diameter}px`;
  ripple.style.height = `${diameter}px`;
  ripple.style.left = `${event.clientX - rect.left - radius}px`;
  ripple.style.top = `${event.clientY - rect.top - radius}px`;
  button.appendChild(ripple);
  ripple.addEventListener('animationend', () => {
    ripple.remove();
  }, { once: true });
}

/** Installs a delegated ripple listener on the application root. */
export function installRipples(root: HTMLElement): void {
  root.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || prefersReducedMotion()) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest<HTMLButtonElement>('.base-action');
    if (button === null || button.disabled) {
      return;
    }
    spawnRipple(button, event);
  });
}
