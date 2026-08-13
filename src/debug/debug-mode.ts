import type { GameStore } from '../app/store';
import { contentCatalog } from '../content/catalog';
import { saveGame } from '../persistence/save-repository';

export interface ShmupDebugBridge {
  readonly store: GameStore;
  readonly getGame: () => unknown;
}

declare global {
  interface Window {
    __shmup?: ShmupDebugBridge;
  }
}

export function installShmupDebugBridge(bridge: ShmupDebugBridge): void {
  window.__shmup = bridge;
}

interface CombatDebugSurface {
  setDebugInvincible(flag: boolean): void;
  debugSpawnElite(): void;
  debugSkipToExtraction(): void;
}

const DEBUG_ENABLED = import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('debug') === 'true';

let panel: HTMLElement | null = null;
let invincible = false;

function combatScene(): CombatDebugSurface | null {
  const game = window.__shmup?.getGame() as
    | { scene?: { getScene(name: string): unknown } }
    | null
    | undefined;
  const scene = game?.scene?.getScene('combat');
  return (scene as CombatDebugSurface | undefined) ?? null;
}

function dispatch(command: Parameters<GameStore['dispatch']>[0]): void {
  try {
    window.__shmup?.store.dispatch(command);
  } catch {
    // Debug helpers may target states where a command is not legal.
  }
}

function makeButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function buildPanel(): HTMLElement {
  const element = document.createElement('div');
  element.id = 'debug-panel';
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-label', 'Debug controls');
  element.style.cssText = [
    'position:fixed',
    'left:0.75rem',
    'bottom:0.75rem',
    'z-index:400',
    'width:16rem',
    'max-height:calc(100dvh - 2rem)',
    'overflow:auto',
    'padding:0.75rem',
    'border:1px solid #3d5a63',
    'border-radius:0.3rem',
    'background:rgb(7 13 17 / 96%)',
    'color:#dceff0',
    'font-family:ui-monospace,SFMono-Regular,Menlo,monospace',
    'font-size:0.62rem',
    'display:grid',
    'grid-template-columns:1fr 1fr',
    'gap:0.4rem',
  ].join(';');

  const title = document.createElement('strong');
  title.textContent = 'DEBUG';
  title.style.gridColumn = '1 / -1';
  element.appendChild(title);

  const add = (label: string, onClick: () => void): void => {
    const button = makeButton(label, onClick);
    button.style.cssText = [
      'padding:0.35rem',
      'border:1px solid #2e4a54',
      'border-radius:0.2rem',
      'background:#0e1a20',
      'color:#aee7d3',
      'cursor:pointer',
      'text-transform:uppercase',
      'letter-spacing:0.05em',
    ].join(';');
    element.appendChild(button);
  };

  add('+1000 CR', () => dispatch({ type: 'DEBUG_GRANT', credits: 1_000 }));
  add('+100 MAT', () => dispatch({ type: 'DEBUG_GRANT', materials: 100 }));
  add('+100 RES', () => dispatch({ type: 'DEBUG_GRANT', research: 100 }));
  add('BUILD ALL', () => {
    for (const building of contentCatalog.buildings) {
      dispatch({ type: 'CONSTRUCT_BUILDING', buildingId: building.id });
    }
  });
  add('HIRE SCI', () => {
    dispatch({ type: 'HIRE_STAFF', roleId: contentCatalog.staffRoles[0].id });
  });
  add('HIRE ENG', () => {
    dispatch({ type: 'HIRE_STAFF', roleId: contentCatalog.staffRoles[1].id });
  });
  add('HIRE TRD', () => {
    dispatch({ type: 'HIRE_STAFF', roleId: contentCatalog.staffRoles[2].id });
  });
  add('FLEET READY', () => {
    const ids = window.__shmup?.store.getSnapshot().base.hangarSlots.filter(
      (id): id is string => id !== null,
    );
    for (const aircraftId of ids ?? []) {
      dispatch({ type: 'REFUEL_AIRCRAFT', aircraftId });
      dispatch({ type: 'REPAIR_AIRCRAFT', aircraftId, emergency: true });
    }
  });
  add('+20 ROCKETS', () => {
    for (let index = 0; index < 20; index += 1) {
      dispatch({
        type: 'PURCHASE_CONSUMABLE',
        consumableId: contentCatalog.consumables[0].id,
      });
    }
  });
  add('FINISH RES', () => dispatch({ type: 'DEBUG_COMPLETE_RESEARCH' }));
  add('INVINCIBLE', () => {
    invincible = !invincible;
    combatScene()?.setDebugInvincible(invincible);
  });
  add('SPAWN WARDEN', () => combatScene()?.debugSpawnElite());
  add('SKIP EXTRACT', () => combatScene()?.debugSkipToExtraction());
  add('PRINT STATE', () => {
    console.log(window.__shmup?.store.getSnapshot());
  });
  add('SAVE NOW', () => {
    saveGame(window.localStorage, window.__shmup?.store.getSnapshot() as never);
  });

  return element;
}

export function initDebugMode(): void {
  if (DEBUG_ENABLED === false) {
    return;
  }
  window.addEventListener('keydown', (event) => {
    if (event.key === 'F3') {
      event.preventDefault();
      if (panel === null) {
        panel = buildPanel();
        document.body.appendChild(panel);
      } else {
        panel.hidden = panel.hidden ? false : true;
      }
    }
  });
  console.info('Debug mode enabled. Press F3 to toggle the debug panel.');
}
