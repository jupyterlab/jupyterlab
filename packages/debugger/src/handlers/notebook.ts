// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import type { Cell, CodeCell, ICellModel } from '@jupyterlab/cells';
import type { INotebookModel, NotebookPanel } from '@jupyterlab/notebook';
import type { IObservableList, IObservableMap } from '@jupyterlab/observables';
import { ObservableMap } from '@jupyterlab/observables';
import type { IDisposable } from '@lumino/disposable';
import { Signal } from '@lumino/signaling';
import type { IDebugger } from '../tokens';
import { EditorHandler } from './editor';
import type { ITranslator } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import { DebuggerPausedOverlay } from './pausedoverlay';

/**
 * A handler for notebooks.
 */
export class NotebookHandler implements IDisposable {
  /**
   * Instantiate a new NotebookHandler.
   *
   * @param options The instantiation options for a NotebookHandler.
   */
  constructor(options: NotebookHandler.IOptions) {
    this._debuggerService = options.debuggerService;
    this._notebookPanel = options.widget;
    this._cellMap = new ObservableMap<EditorHandler>();
    this.translator = options.translator || nullTranslator;
    this._pausedOverlay = new DebuggerPausedOverlay({
      debuggerService: this._debuggerService,
      container: this._notebookPanel.node,
      translator: this.translator
    });

    const notebook = this._notebookPanel.content;
    notebook.model!.cells.changed.connect(this._onCellsChanged, this);

    // Undo must not restore breakpoints that Remove All Breakpoints removed,
    // which empties a model with breakpoints: switching to a kernel without
    // breakpoints restores an empty model too.
    const breakpoints = this._debuggerService.model.breakpoints;
    this._hadBreakpoints = breakpoints.breakpoints.size > 0;
    breakpoints.changed.connect(() => {
      this._hadBreakpoints = breakpoints.breakpoints.size > 0;
    }, this);
    breakpoints.restored.connect(() => {
      const hasBreakpoints = breakpoints.breakpoints.size > 0;
      if (this._hadBreakpoints && !hasBreakpoints) {
        this._deletedBreakpoints.clear();
      }
      this._hadBreakpoints = hasBreakpoints;
    }, this);

    this._debuggerService.session?.eventMessage.connect((_, event) => {
      const session = this._debuggerService.session;
      const contextSession = this._notebookPanel.sessionContext.session;

      if (!session || !contextSession) {
        return;
      }
      if (session.connection?.kernel?.id !== contextSession.kernel?.id) {
        return;
      }

      if (event.event === 'stopped') {
        void this._pausedOverlay.show();
      } else if (event.event === 'continued' || event.event === 'terminated') {
        void this._pausedOverlay.hide();
      }
    }, this);

    if (this._debuggerService.hasStoppedThreads() === true) {
      void this._pausedOverlay.show();
    }

    this._onCellsChanged();
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

    this._pausedOverlay.dispose();

    this._cellMap.values().forEach(handler => {
      handler.dispose();
      // Ensure to restore notebook editor settings
      handler.editor?.setOptions({
        ...this._notebookPanel.content.editorConfig.code
      });
    });
    this._cellMap.dispose();
    // The listeners on the cells keep this handler until the notebook closes.
    this._deletedBreakpoints.clear();
    Signal.clearData(this);
  }

  /**
   * Handle a notebook cells changed event.
   */
  private _onCellsChanged(
    cells?: INotebookModel['cells'],
    changes?: IObservableList.IChangedArgs<ICellModel>
  ): void {
    this._notebookPanel.content.widgets.forEach(cell =>
      this._addEditorHandler(cell)
    );

    if (changes?.type === 'move') {
      for (const cell of changes.newValues) {
        this._cellMap.get(cell.id)?.refreshBreakpoints();
      }
    }
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
      if (this._isDeleted(modelId)) {
        const breakpoints = editorHandler.clearDeletedBreakpoints();
        if (breakpoints.length) {
          const file = Private.fileName(breakpoints[0].source?.path ?? '');
          this._deletedBreakpoints.set(file, breakpoints);
        }
      }
      editorHandler.dispose();
    });
    this._cellMap.set(cell.model.id, editorHandler);
    this._restoreBreakpoints(cell.model);
  }

  /**
   * Restore the breakpoints that deleting a cell removed, when undo or a
   * paste after cut or copy brings back a cell with the same code.
   */
  private _restoreBreakpoints(model: ICellModel): void {
    if (!this._deletedBreakpoints.size) {
      return;
    }
    const code = model.sharedModel.getSource();
    const file = Private.fileName(this._debuggerService.getCodeId(code));
    const breakpoints = this._deletedBreakpoints.get(file);
    if (!breakpoints) {
      return;
    }
    this._deletedBreakpoints.delete(file);
    void this._debuggerService.updateBreakpoints(code, breakpoints);
  }

  /**
   * Whether the code cell with the given ID left the notebook, or is no
   * longer a code cell.
   *
   * Moving a cell or changing its type disposes its widget and inserts a copy
   * with the same ID.
   */
  private _isDeleted(id: string): boolean {
    const model = this._notebookPanel.content.model;
    return (
      !!model &&
      !model.sharedModel.cells.some(
        cell => cell.getId() === id && cell.cell_type === 'code'
      )
    );
  }

  private _debuggerService: IDebugger;
  private _deletedBreakpoints = new Map<string, IDebugger.IBreakpoint[]>();
  private _hadBreakpoints = false;
  private _notebookPanel: NotebookPanel;
  private _cellMap: IObservableMap<EditorHandler>;
  private _pausedOverlay: DebuggerPausedOverlay;
  protected translator: ITranslator;
}

/**
 * A namespace for NotebookHandler statics.
 */
export namespace NotebookHandler {
  /**
   * Instantiation options for `NotebookHandler`.
   */
  export interface IOptions {
    /**
     * The debugger service.
     */
    debuggerService: IDebugger;

    /**
     * The widget to handle.
     */
    widget: NotebookPanel;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}

/**
 * A namespace for module private data.
 */
namespace Private {
  /**
   * Get the name of a code file without its folder. A kernel restart moves
   * the code files to a new folder and keeps their names.
   */
  export function fileName(path: string): string {
    return path.split(/[/\\]/).pop() ?? '';
  }
}
