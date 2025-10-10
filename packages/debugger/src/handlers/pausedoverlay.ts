// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDebugger } from '../tokens';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { runIcon, stepOverIcon } from '@jupyterlab/ui-components';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

/**
 * A reusable helper to show a "Paused in Debugger" overlay and block interactions.
 */
export class DebuggerPausedOverlay {
  constructor(options: DebuggerPausedOverlay.IOptions) {
    this._debuggerService = options.debuggerService;
    this._container = options.container;
    this._settings = options.settings ?? null;
    this._trans = (options.translator || nullTranslator).load('jupyterlab');

    // Create overlay
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

    overlay.style.pointerEvents = 'auto';
    this._overlay = overlay;
  }

  /**
   * Show the overlay, if enabled by user settings.
   */
  async show(): Promise<void> {
    const showOverlay =
      (this._settings?.composite['showPausedOverlay'] as boolean) ?? true;

    if (!showOverlay || !this._overlay || this._overlay.isConnected) {
      return;
    }

    // Block interactions with the underlying container
    this._container.style.pointerEvents = 'none';
    this._container.appendChild(this._overlay);
  }

  /**
   * Hide and unmount the overlay.
   */
  hide(): void {
    if (!this._overlay || !this._overlay.isConnected) {
      return;
    }
    this._container.style.pointerEvents = '';
    this._overlay.remove();
  }

  /**
   * Dispose of the overlay completely.
   */
  dispose(): void {
    this.hide();
    this._overlay = null;
  }

  private _debuggerService: IDebugger;
  private _container: HTMLElement;
  private _settings: ISettingRegistry.ISettings | null;
  private _trans: TranslationBundle;
  private _overlay: HTMLDivElement | null;
}

export namespace DebuggerPausedOverlay {
  export interface IOptions {
    debuggerService: IDebugger;
    container: HTMLElement;
    settings?: ISettingRegistry.ISettings;
    translator?: ITranslator;
  }
}
