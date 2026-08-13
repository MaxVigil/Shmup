const TOAST_DURATION_MS = 4000;

function ensureContainer(): HTMLElement {
  let container = document.getElementById('toast-container');
  if (container === null) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message: string): void {
  const container = ensureContainer();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  window.setTimeout(() => toast.remove(), TOAST_DURATION_MS);
}
