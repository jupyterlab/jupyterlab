// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { SessionContext } from '@jupyterlab/apputils';
import { Cell, ICellModel } from '@jupyterlab/cells';
import { IEditorMimeTypeService } from '@jupyterlab/codeeditor';
import {
  Document,
  IAdapterOptions,
  IVirtualPosition,
  untilReady,
  VirtualDocument,
  WidgetLSPAdapter
} from '@jupyterlab/lsp';
import * as nbformat from '@jupyterlab/nbformat';
import { IObservableList } from '@jupyterlab/observables';
import { Session } from '@jupyterlab/services';
import { PromiseDelegate } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';

import { NotebookPanel } from './panel';
import { Notebook } from './widget';
import { CellList } from './celllist';

type ILanguageInfoMetadata = nbformat.ILanguageInfoMetadata;

export class NotebookAdapter extends WidgetLSPAdapter<NotebookPanel> {
  constructor(
    public editorWidget: NotebookPanel,
    protected options: IAdapterOptions
  ) {
    super(editorWidget, options);
    this._editorToCell = new Map();
    this.editor = editorWidget.content;
    this._cellToEditor = new WeakMap();
    this.isReady = this.isReady.bind(this);
    Promise.all([
      this.widget.context.sessionContext.ready,
      this.connectionManager.ready
    ])
      .then(async () => {
        await this.initOnceReady();
        this._readyDelegate.resolve();
      })
      .catch(console.error);
  }

  /**
   * The wrapped `Notebook` widget.
   */
  readonly editor: Notebook;

  /**
   * Get current path of the document.
   */
  get documentPath(): string {
    return this.widget.context.path;
  }

  /**
   * Get the mime type of the document.
   */
  get mimeType(): string {
    let mimeType: string | string[];
    let languageMetadata = this.language_info();
    if (!languageMetadata || !languageMetadata.mimetype) {
      // fallback to the code cell mime type if no kernel in use
      mimeType = this.widget.content.codeMimetype;
    } else {
      mimeType = languageMetadata.mimetype;
    }
    return Array.isArray(mimeType)
      ? mimeType[0] ?? IEditorMimeTypeService.defaultMimeType
      : mimeType;
  }

  /**
   * Get the file extension of the document.
   */
  get languageFileExtension(): string | undefined {
    let languageMetadata = this.language_info();
    if (!languageMetadata || !languageMetadata.file_extension) {
      return;
    }
    return languageMetadata.file_extension.replace('.', '');
  }

  /**
   * Get the inner HTMLElement of the document widget.
   */
  get wrapperElement(): HTMLElement {
    return this.widget.node;
  }

  /**
   *  Get the list of CM editor with its type in the document,
   */
  get editors(): Document.ICodeBlockOptions[] {
    if (this.isDisposed) {
      return [];
    }

    let notebook = this.widget.content;

    this._editorToCell.clear();

    if (notebook.isDisposed) {
      return [];
    }

    return notebook.widgets.map(cell => {
      return {
        ceEditor: this._getCellEditor(cell),
        type: cell.model.type,
        value: cell.model.sharedModel.getSource()
      };
    });
  }

  /**
   * Get the activated CM editor.
   */
  get activeEditor(): Document.IEditor | undefined {
    return this.editor.activeCell
      ? this._getCellEditor(this.editor.activeCell)
      : undefined;
  }

  /**
   * Promise that resolves once the adapter is initialized
   */
  get ready(): Promise<void> {
    return this._readyDelegate.promise;
  }

  /**
   * Get the index of editor from the cursor position in the virtual
   * document.
   * @deprecated This is error-prone and will be removed in JupyterLab 5.0, use `getEditorIndex()` with `virtualDocument.getEditorAtVirtualLine(position)` instead.
   *
   * @param position - the position of cursor in the virtual document.
   */
  getEditorIndexAt(position: IVirtualPosition): number {
    let cell = this._getCellAt(position);
    let notebook = this.widget.content;
    return notebook.widgets.findIndex(otherCell => {
      return cell === otherCell;
    });
  }

  /**
   * Get the index of input editor
   *
   * @param ceEditor - instance of the code editor
   */
  getEditorIndex(ceEditor: Document.IEditor): number {
    let cell = this._editorToCell.get(ceEditor)!;
    return this.editor.widgets.findIndex(otherCell => {
      return cell === otherCell;
    });
  }

  /**
   * Get the wrapper of input editor.
   *
   * @param ceEditor - instance of the code editor
   */
  getEditorWrapper(ceEditor: Document.IEditor): HTMLElement {
    let cell = this._editorToCell.get(ceEditor)!;
    return cell.node;
  }

  /**
   * Callback on kernel changed event, it will disconnect the
   * document with the language server and then reconnect.
   *
   * @param _session - Session context of changed kernel
   * @param change - Changed data
   */
  async onKernelChanged(
    _session: SessionContext,
    change: Session.ISessionConnection.IKernelChangedArgs
  ): Promise<void> {
    if (!change.newValue) {
      return;
    }
    try {
      // note: we need to wait until ready before updating language info
      const oldLanguageInfo = this._languageInfo;
      await untilReady(this.isReady, -1);
      await this._updateLanguageInfo();
      const newLanguageInfo = this._languageInfo;
      if (
        oldLanguageInfo?.name != newLanguageInfo.name ||
        oldLanguageInfo?.mimetype != newLanguageInfo?.mimetype ||
        oldLanguageInfo?.file_extension != newLanguageInfo?.file_extension
      ) {
        console.log(
          `Changed to ${this._languageInfo.name} kernel, reconnecting`
        );
        this.reloadConnection();
      } else {
        console.log(
          'Keeping old LSP connection as the new kernel uses the same language'
        );
      }
    } catch (err) {
      console.warn(err);
      // try to reconnect anyway
      this.reloadConnection();
    }
  }

  /**
   * Dispose the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.widget.context.sessionContext.kernelChanged.disconnect(
      this.onKernelChanged,
      this
    );
    this.widget.content.activeCellChanged.disconnect(
      this._activeCellChanged,
      this
    );

    super.dispose();

    // editors are needed for the parent dispose() to unbind signals, so they are the last to go
    this._editorToCell.clear();
    Signal.clearData(this);
  }

  /**
   * Method to check if the notebook context is ready.
   */
  isReady(): boolean {
    return (
      !this.widget.isDisposed &&
      this.widget.context.isReady &&
      this.widget.content.isVisible &&
      this.widget.content.widgets.length > 0 &&
      this.widget.context.sessionContext.session?.kernel != null
    );
  }

  /**
   * Update the virtual document on cell changing event.
   *
   * @param cells - Observable list of changed cells
   * @param change - Changed data
   */
  async handleCellChange(
    cells: CellList,
    change: IObservableList.IChangedArgs<ICellModel>
  ): Promise<void> {
    let cellsAdded: ICellModel[] = [];
    let cellsRemoved: ICellModel[] = [];
    const type = this._type;
    if (change.type === 'set') {
      // handling of conversions is important, because the editors get re-used and their handlers inherited,
      // so we need to clear our handlers from editors of e.g. markdown cells which previously were code cells.
      let convertedToMarkdownOrRaw = [];
      let convertedToCode = [];

      if (change.newValues.length === change.oldValues.length) {
        // during conversion the cells should not get deleted nor added
        for (let i = 0; i < change.newValues.length; i++) {
          if (
            change.oldValues[i].type === type &&
            change.newValues[i].type !== type
          ) {
            convertedToMarkdownOrRaw.push(change.newValues[i]);
          } else if (
            change.oldValues[i].type !== type &&
            change.newValues[i].type === type
          ) {
            convertedToCode.push(change.newValues[i]);
          }
        }
        cellsAdded = convertedToCode;
        cellsRemoved = convertedToMarkdownOrRaw;
      }
    } else if (change.type == 'add') {
      cellsAdded = change.newValues.filter(
        cellModel => cellModel.type === type
      );
    }
    // note: editorRemoved is not emitted for removal of cells by change of type 'remove' (but only during cell type conversion)
    // because there is no easy way to get the widget associated with the removed cell(s) - because it is no
    // longer in the notebook widget list! It would need to be tracked on our side, but it is not necessary
    // as (except for a tiny memory leak) it should not impact the functionality in any way

    if (
      cellsRemoved.length ||
      cellsAdded.length ||
      change.type === 'set' ||
      change.type === 'move' ||
      change.type === 'remove'
    ) {
      // in contrast to the file editor document which can be only changed by the modification of the editor content,
      // the notebook document can also get modified by a change in the number or arrangement of editors themselves;
      // for this reason each change has to trigger documents update (so that LSP mirror is in sync).
      await this.updateDocuments();
    }

    for (let cellModel of cellsAdded) {
      let cellWidget = this.widget.content.widgets.find(
        cell => cell.model.id === cellModel.id
      );
      if (!cellWidget) {
        console.warn(
          `Widget for added cell with ID: ${cellModel.id} not found!`
        );
        continue;
      }

      // Add editor to the mapping if needed
      this._getCellEditor(cellWidget);
    }
  }

  /**
   * Generate the virtual document associated with the document.
   */
  createVirtualDocument(): VirtualDocument {
    return new VirtualDocument({
      language: this.language,
      foreignCodeExtractors: this.options.foreignCodeExtractorsManager,
      path: this.documentPath,
      fileExtension: this.languageFileExtension,
      // notebooks are continuous, each cell is dependent on the previous one
      standalone: false,
      // notebooks are not supported by LSP servers
      hasLspSupportedFile: false
    });
  }

  /**
   * Get the metadata of notebook.
   */
  protected language_info(): ILanguageInfoMetadata {
    return this._languageInfo;
  }
  /**
   * Initialization function called once the editor and the LSP connection
   * manager is ready. This function will create the virtual document and
   * connect various signals.
   */
  protected async initOnceReady(): Promise<void> {
    await untilReady(this.isReady.bind(this), -1);
    await this._updateLanguageInfo();
    this.initVirtual();

    // connect the document, but do not open it as the adapter will handle this
    // after registering all features
    this.connectDocument(this.virtualDocument!, false).catch(console.warn);

    this.widget.context.sessionContext.kernelChanged.connect(
      this.onKernelChanged,
      this
    );

    this.widget.content.activeCellChanged.connect(
      this._activeCellChanged,
      this
    );
    this._connectModelSignals(this.widget);
    this.editor.modelChanged.connect(notebook => {
      // note: this should not usually happen;
      // there is no default action that would trigger this,
      // its just a failsafe in case if another extension decides
      // to swap the notebook model
      console.warn(
        'Model changed, connecting cell change handler; this is not something we were expecting'
      );
      this._connectModelSignals(notebook);
    });
  }

  /**
   * Connect the cell changed event to its handler
   *
   * @param  notebook - The notebook that emitted event.
   */
  private _connectModelSignals(notebook: NotebookPanel | Notebook) {
    if (notebook.model === null) {
      console.warn(
        `Model is missing for notebook ${notebook}, cannot connect cell changed signal!`
      );
    } else {
      notebook.model.cells.changed.connect(this.handleCellChange, this);
    }
  }

  /**
   * Update the stored language info with the one from the notebook.
   */
  private async _updateLanguageInfo(): Promise<void> {
    const language_info = (
      await this.widget.context.sessionContext?.session?.kernel?.info
    )?.language_info;
    if (language_info) {
      this._languageInfo = language_info;
    } else {
      throw new Error(
        'Language info update failed (no session, kernel, or info available)'
      );
    }
  }

  /**
   * Handle the cell changed event
   * @param  notebook - The notebook that emitted event
   * @param cell - Changed cell.
   */
  private _activeCellChanged(notebook: Notebook, cell: Cell | null) {
    if (!cell || cell.model.type !== this._type) {
      return;
    }

    this._activeEditorChanged.emit({
      editor: this._getCellEditor(cell)
    });
  }

  /**
   * Get the cell at the cursor position of the virtual document.
   * @param  pos - Position in the virtual document.
   */
  private _getCellAt(pos: IVirtualPosition): Cell {
    let editor = this.virtualDocument!.getEditorAtVirtualLine(pos);
    return this._editorToCell.get(editor)!;
  }

  /**
   * Get the cell editor and add new ones to the mappings.
   *
   * @param cell Cell widget
   * @returns Cell editor accessor
   */
  private _getCellEditor(cell: Cell): Document.IEditor {
    if (!this._cellToEditor.has(cell)) {
      const editor = Object.freeze({
        getEditor: () => cell.editor,
        ready: async () => {
          await cell.ready;
          return cell.editor!;
        },
        reveal: async () => {
          await this.editor.scrollToCell(cell);
          return cell.editor!;
        }
      });

      this._cellToEditor.set(cell, editor);
      this._editorToCell.set(editor, cell);
      cell.disposed.connect(() => {
        this._cellToEditor.delete(cell);
        this._editorToCell.delete(editor);
        this._editorRemoved.emit({
          editor
        });
      });

      this._editorAdded.emit({
        editor
      });
    }

    return this._cellToEditor.get(cell)!;
  }

  /**
   * A map between the editor accessor and the containing cell
   */
  private _editorToCell: Map<Document.IEditor, Cell>;

  /**
   * Mapping of cell to editor accessor to ensure accessor uniqueness.
   */
  private _cellToEditor: WeakMap<Cell, Document.IEditor>;

  /**
   * Metadata of the notebook
   */
  private _languageInfo: ILanguageInfoMetadata;

  private _type: nbformat.CellType = 'code';

  private _readyDelegate = new PromiseDelegate<void>();
}
