import { IDebugger } from '../tokens';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { runIcon, stepOverIcon } from '@jupyterlab/ui-components';

/**
 * A reusable helper to show a "Paused in Debugger" overlay and block interactions.
 */
export class DebuggerPausedOverlay {
  constructor(options: DebuggerPausedOverlay.IOptions) {
    this._debuggerService = options.debuggerService;
    this._container = options.container;
    this._trans = (options.translator || nullTranslator).load('jupyterlab');
  }

  show(): void {
    if (this._overlay) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'jp-DebuggerPausedOverlay';

    const text = document.createElement('span');
    text.textContent = this._trans.__('Paused in Debugger');
    overlay.appendChild(text);

    const continueBtn = document.createElement('button');
    continueBtn.className = 'jp-DebuggerPausedButton';
    continueBtn.title = this._trans.__('Continue');
    runIcon.element({ container: continueBtn, elementPosition: 'center' });
    continueBtn.onclick = () => {
      void this._debuggerService.continue();
    };

    const nextBtn = document.createElement('button');
    nextBtn.className = 'jp-DebuggerPausedButton';
    nextBtn.title = this._trans.__('Next');
    stepOverIcon.element({ container: nextBtn, elementPosition: 'center' });
    nextBtn.onclick = () => {
      void this._debuggerService.next();
    };

    overlay.appendChild(continueBtn);
    overlay.appendChild(nextBtn);

    // Block interactions with the container
    this._container.style.pointerEvents = 'none';
    overlay.style.pointerEvents = 'auto';
    this._container.appendChild(overlay);

    this._overlay = overlay;
  }

  hide(): void {
    if (!this._overlay) {
      return;
    }
    this._container.style.pointerEvents = '';
    this._overlay.remove();
    this._overlay = null;
  }

  dispose(): void {
    this.hide();
  }

  private _debuggerService: IDebugger;
  private _container: HTMLElement;
  private _trans: TranslationBundle;
  private _overlay: HTMLDivElement | null = null;
}

export namespace DebuggerPausedOverlay {
  export interface IOptions {
    debuggerService: IDebugger;
    container: HTMLElement;
    translator?: ITranslator;
  }
}
