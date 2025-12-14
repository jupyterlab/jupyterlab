// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDisposable } from '@lumino/disposable';
import { IDebugger } from '../tokens';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { runIcon, stepOverIcon, stopIcon } from '@jupyterlab/ui-components';

/**
 * A reusable helper to show a "Paused in Debugger" overlay and block interactions.
 */
export class DebuggerPausedOverlay implements IDisposable {
  constructor(options: DebuggerPausedOverlay.IOptions) {
    this._debuggerService = options.debuggerService;
    this._container = options.container;
    this._trans = (options.translator || nullTranslator).load('jupyterlab');

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'jp-DebuggerPausedOverlay';

    const text = document.createElement('span');
    text.textContent = this._trans.__('Paused in Debugger');
    overlay.appendChild(text);

    // Continue
    const continueBtn = document.createElement('button');
    continueBtn.className = 'jp-DebuggerPausedButton';
    continueBtn.title = this._trans.__('Continue');
    runIcon.element({ container: continueBtn, elementPosition: 'center' });
    continueBtn.onclick = () => {
      void this._debuggerService.continue();
    };
    overlay.appendChild(continueBtn);

    // Step over
    const nextBtn = document.createElement('button');
    nextBtn.className = 'jp-DebuggerPausedButton';
    nextBtn.title = this._trans.__('Next');
    stepOverIcon.element({ container: nextBtn, elementPosition: 'center' });
    nextBtn.onclick = () => {
      void this._debuggerService.next();
    };
    overlay.appendChild(nextBtn);

    // Stop Debugger
    const stopBtn = document.createElement('button');
    stopBtn.className = 'jp-DebuggerPausedButton jp-DebuggerStopButton';
    stopBtn.title = this._trans.__('Stop Debugger');
    stopIcon.element({ container: stopBtn, elementPosition: 'center' });
    stopBtn.onclick = async () => {
      // Disconnects the debugger session
      await this._debuggerService.stop();
    };
    overlay.appendChild(stopBtn);

    overlay.style.pointerEvents = 'auto';
    this._overlay = overlay;
  }

  /**
   * Show the overlay, if enabled by user settings.
   */
  show(): void {
    if (this._isDisposed) {
      return;
    }

    const showOverlay = document.body.dataset.showPausedOverlay !== 'false';
    if (!showOverlay || !this._overlay || this._overlay.isConnected) {
      return;
    }

    this._container.appendChild(this._overlay);
  }

  /**
   * Hide and unmount the overlay.
   */
  hide(): void {
    if (this._isDisposed || !this._overlay || !this._overlay.isConnected) {
      return;
    }
    this._container.style.pointerEvents = '';
    this._overlay.remove();
  }

  /**
   * Dispose of the overlay completely.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.hide();
    this._overlay = null;
  }

  /**
   * Whether the overlay has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  private _debuggerService: IDebugger;
  private _container: HTMLElement;
  private _trans: TranslationBundle;
  private _overlay: HTMLDivElement | null;
  private _isDisposed = false;
}

export namespace DebuggerPausedOverlay {
  export interface IOptions {
    debuggerService: IDebugger;
    container: HTMLElement;
    translator?: ITranslator;
  }
}
