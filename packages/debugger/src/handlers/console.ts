// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeConsole, ConsolePanel } from '@jupyterlab/console';

import { Cell, CodeCell } from '@jupyterlab/cells';

import { IObservableMap, ObservableMap } from '@jupyterlab/observables';

import { IDisposable } from '@lumino/disposable';

import { Signal } from '@lumino/signaling';

import { EditorHandler } from '../handlers/editor';

import { IDebugger } from '../tokens';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { runIcon, stepOverIcon } from '@jupyterlab/ui-components';

/**
 * A handler for consoles.
 */
export class ConsoleHandler implements IDisposable {
  /**
   * Instantiate a new ConsoleHandler.
   *
   * @param options The instantiation options for a ConsoleHandler.
   */
  constructor(options: ConsoleHandler.IOptions) {
    this._debuggerService = options.debuggerService;
    this._consolePanel = options.widget;
    this._cellMap = new ObservableMap<EditorHandler>();
    this.translator = options.translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');

    const codeConsole = this._consolePanel.console;

    if (codeConsole.promptCell) {
      this._addEditorHandler(codeConsole.promptCell);
    }
    codeConsole.promptCellCreated.connect((_: CodeConsole, cell: CodeCell) => {
      this._addEditorHandler(cell);
    });

    const addHandlers = (): void => {
      for (const cell of codeConsole.cells) {
        this._addEditorHandler(cell);
      }
    };
    addHandlers();
    this._consolePanel.console.cells.changed.connect(addHandlers);

    // Connect debugger events
    this._debuggerService.session?.eventMessage.connect((_, event) => {
      const session = this._debuggerService.session;
      const contextSession = this._consolePanel.sessionContext.session;

      if (!session || !contextSession) {
        return;
      }
      if (session.connection?.kernel?.id !== contextSession.kernel?.id) {
        return;
      }

      if (event.event === 'stopped') {
        this._showPausedOverlay();
      } else if (event.event === 'continued') {
        this._hidePausedOverlay();
      }
    });

    // If already paused when initialized
    if (this._debuggerService.hasStoppedThreads()) {
      this._showPausedOverlay();
    }
  }

  /**
   * Whether the handler is disposed.
   */
  isDisposed: boolean;

  /**
   * Dispose the handler.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    this._cellMap.values().forEach(handler => handler.dispose());
    this._cellMap.dispose();
    Signal.clearData(this);
    this._hidePausedOverlay();
  }

  /**
   * Add a new editor handler for the given cell.
   *
   * @param cell The cell to add the handler to.
   */
  private _addEditorHandler(cell: Cell): void {
    const modelId = cell.model.id;
    if (cell.model.type !== 'code' || this._cellMap.has(modelId)) {
      return;
    }
    const codeCell = cell as CodeCell;
    const editorHandler = new EditorHandler({
      debuggerService: this._debuggerService,
      editorReady: async () => {
        await codeCell.ready;
        return codeCell.editor!;
      },
      getEditor: () => codeCell.editor,
      src: cell.model.sharedModel
    });
    codeCell.disposed.connect(() => {
      this._cellMap.delete(modelId);
      editorHandler.dispose();
    });
    this._cellMap.set(modelId, editorHandler);
  }

  /**
   * Show the "Paused in Debugger" overlay.
   */
  private _showPausedOverlay(): void {
    if (this._pausedOverlay) {
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

    this._consolePanel.node.style.pointerEvents = 'none';
    overlay.style.pointerEvents = 'auto';
    this._consolePanel.node.appendChild(overlay);

    this._pausedOverlay = overlay;
  }

  /**
   * Hide the overlay.
   */
  private _hidePausedOverlay(): void {
    if (!this._pausedOverlay) {
      return;
    }
    this._consolePanel.node.style.pointerEvents = '';
    this._pausedOverlay.remove();
    this._pausedOverlay = null;
  }

  private _consolePanel: ConsolePanel;
  private _debuggerService: IDebugger;
  private _cellMap: IObservableMap<EditorHandler>;
  private _pausedOverlay: HTMLDivElement | null = null;
  private _trans: TranslationBundle;
  protected translator: ITranslator;
}

/**
 * A namespace for ConsoleHandler `statics`.
 */
export namespace ConsoleHandler {
  /**
   * Instantiation options for `ConsoleHandler`.
   */
  export interface IOptions {
    /**
     * The debugger service.
     */
    debuggerService: IDebugger;

    /**
     * The widget to handle.
     */
    widget: ConsolePanel;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}
