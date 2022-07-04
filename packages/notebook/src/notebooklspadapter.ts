import { SessionContext } from '@jupyterlab/apputils';
import { Cell, ICellModel } from '@jupyterlab/cells';
import { CodeEditor } from '@jupyterlab/codeeditor';
import {
  IAdapterOptions,
  IVirtualPosition,
  untilReady,
  VirtualDocument,
  WidgetAdapter
} from '@jupyterlab/lsp';
import * as nbformat from '@jupyterlab/nbformat';
import {
  IObservableList,
  IObservableUndoableList
} from '@jupyterlab/observables';
import { Session } from '@jupyterlab/services';

import { NotebookPanel } from './panel';
import { Notebook } from './widget';

type IEditor = CodeEditor.IEditor;
type ILanguageInfoMetadata = nbformat.ILanguageInfoMetadata;

export class NotebookAdapter extends WidgetAdapter<NotebookPanel> {
  editor: Notebook;
  private ceEditorToCell: Map<IEditor, Cell>;
  private knownEditorsIds: Set<string>;

  private _languageInfo: ILanguageInfoMetadata;
  private type: nbformat.CellType = 'code';

  constructor(
    protected options: IAdapterOptions,
    public editorWidget: NotebookPanel
  ) {
    super(options, editorWidget);
    this.ceEditorToCell = new Map();
    this.editor = editorWidget.content;
    this.knownEditorsIds = new Set();
    this.initialized = new Promise<void>((resolve, reject) => {
      this.initOnceReady().then(resolve).catch(reject);
    });
  }

  private async updateLanguageInfo(): Promise<void> {
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
      await this.updateLanguageInfo();
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
          'Keeping old LSP connection as the new kernel uses the same langauge'
        );
      }
    } catch (err) {
      console.warn(err);
      // try to reconnect anyway
      this.reloadConnection();
    }
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.widget.context.sessionContext.kernelChanged.disconnect(
      this.onKernelChanged,
      this
    );
    this.widget.content.activeCellChanged.disconnect(
      this.activeCellChanged,
      this
    );

    super.dispose();

    // editors are needed for the parent dispose() to unbind signals, so they are the last to go
    this.ceEditorToCell.clear();
  }

  isReady(): boolean {
    return (
      !this.widget.isDisposed &&
      this.widget.context.isReady &&
      this.widget.content.isVisible &&
      this.widget.content.widgets.length > 0 &&
      this.widget.context.sessionContext.session?.kernel != null
    );
  }

  get documentPath(): string {
    return this.widget.context.path;
  }

  protected language_info(): ILanguageInfoMetadata {
    return this._languageInfo;
  }

  get mimeType(): string {
    let languageMetadata = this.language_info();
    if (!languageMetadata || !languageMetadata.mimetype) {
      // fallback to the code cell mime type if no kernel in use
      return this.widget.content.codeMimetype;
    }
    return languageMetadata.mimetype;
  }

  get languageFileExtension(): string | undefined {
    let languageMetadata = this.language_info();
    if (!languageMetadata || !languageMetadata.file_extension) {
      return;
    }
    return languageMetadata.file_extension.replace('.', '');
  }

  get wrapperElement(): HTMLElement {
    return this.widget.node;
  }

  protected async initOnceReady(): Promise<void> {
    await this.widget.context.sessionContext.ready;
    await this.connectionManager.ready;
    await untilReady(this.isReady.bind(this), -1);
    await this.updateLanguageInfo();
    this.initVirtual();

    // connect the document, but do not open it as the adapter will handle this
    // after registering all features
    this.connectDocument(this.virtualDocument, false).catch(console.warn);

    this.widget.context.sessionContext.kernelChanged.connect(
      this.onKernelChanged,
      this
    );

    this.widget.content.activeCellChanged.connect(this.activeCellChanged, this);
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

  private _connectModelSignals(notebook: NotebookPanel | Notebook) {
    if (notebook.model === null) {
      console.warn(
        `Model is missing for notebook ${notebook}, cannot connet cell changed signal!`
      );
    } else {
      notebook.model.cells.changed.connect(this.handleCellChange, this);
    }
  }

  async handleCellChange(
    cells: IObservableUndoableList<ICellModel>,
    change: IObservableList.IChangedArgs<ICellModel>
  ): Promise<void> {
    let cellsAdded: ICellModel[] = [];
    let cellsRemoved: ICellModel[] = [];
    const type = this.type;
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
      // the notebook document cna also get modified by a change in the number or arrangement of editors themselves;
      // for this reason each change has to trigger documents update (so that LSP mirror is in sync).
      await this.updateDocuments();
    }

    for (let cellModel of cellsRemoved) {
      let cellWidget = this.widget.content.widgets.find(
        cell => cell.model.id === cellModel.id
      );
      if (!cellWidget) {
        console.warn(
          `Widget for removed cell with ID: ${cellModel.id} not found!`
        );
        continue;
      }
      this.knownEditorsIds.delete(cellWidget.editor.uuid);

      // for practical purposes this editor got removed from our consideration;
      // it might seem that we should instead look for the editor indicated by
      // the oldValues[i] cellModel, but this one got already transferred to the
      // markdown cell in newValues[i]
      this.editorRemoved.emit({
        editor: cellWidget.editor
      });
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
      this.knownEditorsIds.add(cellWidget.editor.uuid);

      this.editorAdded.emit({
        editor: cellWidget.editor
      });
    }
  }

  get editors(): { ceEditor: CodeEditor.IEditor; type: nbformat.CellType }[] {
    if (this.isDisposed) {
      return [];
    }

    let notebook = this.widget.content;

    this.ceEditorToCell.clear();

    if (notebook.isDisposed) {
      return [];
    }

    return notebook.widgets.map(cell => {
      this.ceEditorToCell.set(cell.editor, cell);
      return { ceEditor: cell.editor, type: cell.model.type };
    });
  }

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

  get activeEditor(): CodeEditor.IEditor | undefined {
    return this.widget.content.activeCell?.editor;
  }

  private activeCellChanged(notebook: Notebook, cell: Cell) {
    if (cell.model.type !== this.type) {
      return;
    }
    if (!this.knownEditorsIds.has(cell.editor.uuid)) {
      this.knownEditorsIds.add(cell.editor.uuid);
      this.editorAdded.emit({
        editor: cell.editor
      });
    }
    this.activeEditorChanged.emit({
      editor: cell.editor
    });
  }

  getEditorIndexAt(position: IVirtualPosition): number {
    let cell = this.getCellAt(position);
    let notebook = this.widget.content;
    return notebook.widgets.findIndex(otherCell => {
      return cell === otherCell;
    });
  }

  getEditorIndex(ceEditor: CodeEditor.IEditor): number {
    let cell = this.ceEditorToCell.get(ceEditor)!;
    let notebook = this.widget.content;
    return notebook.widgets.findIndex(otherCell => {
      return cell === otherCell;
    });
  }

  getEditorWrapper(ceEditor: CodeEditor.IEditor): HTMLElement {
    let cell = this.ceEditorToCell.get(ceEditor)!;
    return cell.node;
  }

  private getCellAt(pos: IVirtualPosition): Cell {
    let ceEditor = this.virtualDocument.getEditorAtVirtualLine(pos);
    return this.ceEditorToCell.get(ceEditor)!;
  }
}
