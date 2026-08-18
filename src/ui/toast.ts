const TOAST_DURATION_MS = 4000;
const TOAST_STACK_LIMIT = 4;

function ensureContainer(): HTMLElement {
  let container = document.getElementById('toast-container');
  if (container === null) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  return container;
}

function trimStack(container: HTMLElement): void {
  while (container.childElementCount > TOAST_STACK_LIMIT) {
    container.firstElementChild?.remove();
  }
}

export function showToast(message: string): void {
  const container = ensureContainer();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  trimStack(container);
  window.setTimeout(() => toast.remove(), TOAST_DURATION_MS);
}
