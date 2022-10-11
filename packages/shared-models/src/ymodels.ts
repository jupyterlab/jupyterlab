/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as nbformat from '@jupyterlab/nbformat';
import { JSONExt, UUID } from '@lumino/coreutils';
import { ISignal, Signal } from '@lumino/signaling';
import { Awareness } from 'y-protocols/awareness';
import * as Y from 'yjs';
import {
  CellChange,
  Delta,
  FileChange,
  ISharedBaseCell,
  ISharedBaseCellMetadata,
  ISharedCell,
  ISharedCodeCell,
  ISharedDocument,
  ISharedFile,
  ISharedMarkdownCell,
  ISharedNotebook,
  ISharedRawCell,
  ISharedText,
  NotebookChange
} from './api';

/**
 * Abstract interface to define Shared Models that can be bound to a text editor using any existing
 * Yjs-based editor binding.
 */
export interface IYText extends ISharedText {
  /**
   * Shareable text
   */
  readonly ysource: Y.Text;
  /**
   * Shareable awareness
   */
  readonly awareness: Awareness | null;
  /**
   * Undo manager
   */
  readonly undoManager: Y.UndoManager | null;
}

/**
 * Cell type.
 */
export type YCellType = YRawCell | YCodeCell | YMarkdownCell;

/**
 * Generic shareable document.
 */
export class YDocument<T> implements ISharedDocument {
  readonly ydoc = new Y.Doc();
  readonly ystate: Y.Map<any> = this.ydoc.getMap('state');
  readonly undoManager = new Y.UndoManager([], {
    trackedOrigins: new Set([this]),
    doc: this.ydoc
  });
  readonly awareness = new Awareness(this.ydoc);

  /**
   * The changed signal.
   */
  get changed(): ISignal<this, T> {
    return this._changed;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Whether the object can undo changes.
   */
  canUndo(): boolean {
    return this.undoManager.undoStack.length > 0;
  }

  /**
   * Whether the object can redo changes.
   */
  canRedo(): boolean {
    return this.undoManager.redoStack.length > 0;
  }

  /**
   * Dispose of the resources.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.ydoc.destroy();
    Signal.clearData(this);
  }

  /**
   * Undo an operation.
   */
  undo(): void {
    this.undoManager.undo();
  }

  /**
   * Redo an operation.
   */
  redo(): void {
    this.undoManager.redo();
  }

  /**
   * Clear the change stack.
   */
  clearUndoHistory(): void {
    this.undoManager.clear();
  }

  /**
   * Perform a transaction. While the function f is called, all changes to the shared
   * document are bundled into a single event.
   */
  transact(f: () => void, undoable = true): void {
    this.ydoc.transact(f, undoable ? this : null);
  }

  protected _changed = new Signal<this, T>(this);
  private _isDisposed = false;
}

/**
 * Shareable text file.
 */
export class YFile
  extends YDocument<FileChange>
  implements ISharedFile, ISharedText, IYText
{
  /**
   * Instantiate a new shareable file.
   *
   * @returns The file model
   */
  static create(): YFile {
    const model = new YFile();
    return model;
  }

  constructor() {
    super();
    this.undoManager.addToScope(this.ysource);
    this.ysource.observe(this._modelObserver);
    this.ystate.observe(this._onStateChanged);
  }

  /**
   * File text.
   */
  readonly ysource = this.ydoc.getText('source');

  /**
   * Dispose of the resources.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.ysource.unobserve(this._modelObserver);
    this.ystate.unobserve(this._onStateChanged);
    super.dispose();
  }

  /**
   * Gets cell's source.
   *
   * @returns Cell's source.
   */
  getSource(): string {
    return this.ysource.toString();
  }

  /**
   * Sets cell's source.
   *
   * @param value: New source.
   */
  setSource(value: string): void {
    this.transact(() => {
      const ytext = this.ysource;
      ytext.delete(0, ytext.length);
      ytext.insert(0, value);
    });
  }

  /**
   * Replace content from `start' to `end` with `value`.
   *
   * @param start: The start index of the range to replace (inclusive).
   *
   * @param end: The end index of the range to replace (exclusive).
   *
   * @param value: New source (optional).
   */
  updateSource(start: number, end: number, value = ''): void {
    this.transact(() => {
      const ysource = this.ysource;
      // insert and then delete.
      // This ensures that the cursor position is adjusted after the replaced content.
      ysource.insert(start, value);
      ysource.delete(start + value.length, end - start);
    });
  }

  /**
   * Handle a change to the ymodel.
   */
  private _modelObserver = (event: Y.YTextEvent) => {
    const changes: FileChange = {};
    changes.sourceChange = event.changes.delta as any;
    this._changed.emit(changes);
  };

  /**
   * Handle a change to the ystate.
   */
  private _onStateChanged = (event: Y.YMapEvent<any>) => {
    const stateChange: any = [];

    event.keysChanged.forEach(key => {
      const change = event.changes.keys.get(key);
      if (change) {
        stateChange.push({
          name: key,
          oldValue: change.oldValue,
          newValue: this.ystate.get(key)
        });
      }
    });

    this._changed.emit({ stateChange });
  };
}

/**
 * Shared implementation of the Shared Document types.
 *
 * Shared cells can be inserted into a SharedNotebook.
 * Shared cells only start emitting events when they are connected to a SharedNotebook.
 *
 * "Standalone" cells must not be inserted into a (Shared)Notebook.
 * Standalone cells emit events immediately after they have been created, but they must not
 * be included into a (Shared)Notebook.
 */
export class YNotebook
  extends YDocument<NotebookChange>
  implements ISharedNotebook
{
  /**
   * Create a new YNotebook.
   */
  static create(options: ISharedNotebook.IOptions = {}): ISharedNotebook {
    return new YNotebook(options);
  }

  constructor(options: ISharedNotebook.IOptions = {}) {
    super();
    this._disableDocumentWideUndoRedo =
      options.disableDocumentWideUndoRedo ?? false;
    this._defaultCell = options.defaultCell ?? 'code';
    this.undoManager.addToScope(this.ycells);
    this.ycells.observe(this._onYCellsChanged);
    this.cells = this.ycells.toArray().map(ycell => {
      if (!this._ycellMapping.has(ycell)) {
        this._ycellMapping.set(ycell, createCellModelFromSharedType(ycell));
      }
      return this._ycellMapping.get(ycell) as YCellType;
    });

    this.ymeta.observe(this._onMetaChanged);
    this.ystate.observe(this._onStateChanged);
  }

  /**
   * Internal Yjs cells list
   */
  private readonly ycells: Y.Array<Y.Map<any>> = this.ydoc.getArray('cells');
  readonly ymeta: Y.Map<any> = this.ydoc.getMap('meta');
  readonly ymodel: Y.Map<any> = this.ydoc.getMap('model');
  readonly cells: YCellType[];

  /**
   * Wether the the undo/redo logic should be
   * considered on the full document across all cells.
   *
   * @returns The disableDocumentWideUndoRedo setting.
   */
  get disableDocumentWideUndoRedo(): boolean {
    return this._disableDocumentWideUndoRedo;
  }

  /**
   * Returns the default cell type
   *
   * @returns cell type.
   */
  get defaultCell(): nbformat.CellType {
    return this._defaultCell;
  }

  /**
   * Set the default cell type.
   *
   * @param value 'code' | 'markdown' | 'raw'.
   */
  set defaultCell(value: nbformat.CellType) {
    this._defaultCell = value;
  }

  /**
   * nbformat major version
   */
  get nbformat(): number {
    return this.ymeta.get('nbformat');
  }

  set nbformat(value: number) {
    this.transact(() => {
      this.ymeta.set('nbformat', value);
    }, false);
  }

  /**
   * nbformat minor version
   */
  get nbformat_minor(): number {
    return this.ymeta.get('nbformat_minor');
  }

  set nbformat_minor(value: number) {
    this.transact(() => {
      this.ymeta.set('nbformat_minor', value);
    }, false);
  }

  /**
   * Dispose of the resources.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.ycells.unobserve(this._onYCellsChanged);
    this.ymeta.unobserve(this._onMetaChanged);
    this.ystate.unobserve(this._onStateChanged);
    super.dispose();
  }

  /**
   * Get a shared cell by index.
   *
   * @param index: Cell's position.
   *
   * @returns The requested shared cell.
   */
  getCell(index: number): YCellType {
    return this.cells[index];
  }

  /**
   * Insert a shared cell into a specific position.
   *
   * @param index: Cell's position.
   *
   * @param cell: Cell to insert.
   */
  insertCell(index: number, cell: YCellType): void {
    this.insertCells(index, [cell]);
  }

  /**
   * Insert a list of shared cells into a specific position.
   *
   * @param index: Position to insert the cells.
   *
   * @param cells: Array of shared cells to insert.
   */
  insertCells(index: number, cells: YCellType[]): void {
    cells.forEach(cell => {
      this._ycellMapping.set(cell.ymodel, cell);
      if (!this.disableDocumentWideUndoRedo) {
        cell.undoManager = this.undoManager;
      }
    });
    this.transact(() => {
      this.ycells.insert(
        index,
        cells.map(cell => cell.ymodel)
      );
    });
  }

  /**
   * Move a cell.
   *
   * @param fromIndex: Index of the cell to move.
   *
   * @param toIndex: New position of the cell.
   */
  moveCell(fromIndex: number, toIndex: number): void {
    this.transact(() => {
      const fromCell: any = this.getCell(fromIndex).clone();
      this.deleteCell(fromIndex);
      this.insertCell(toIndex, fromCell);
    });
  }

  /**
   * Remove a cell.
   *
   * @param index: Index of the cell to remove.
   */
  deleteCell(index: number): void {
    this.deleteCellRange(index, index + 1);
  }

  /**
   * Remove a range of cells.
   *
   * @param from: The start index of the range to remove (inclusive).
   *
   * @param to: The end index of the range to remove (exclusive).
   */
  deleteCellRange(from: number, to: number): void {
    this.transact(() => {
      this.ycells.delete(from, to - from);

      if (!this.ycells.length) {
        this.insertCell(0, createCell({ cell_type: this._defaultCell }));
      }
    });
  }

  /**
   * Returns the metadata associated with the notebook.
   *
   * @returns Notebook's metadata.
   */
  getMetadata(): nbformat.INotebookMetadata {
    const meta = this.ymeta.get('metadata');
    return JSONExt.deepCopy(meta ?? {});
  }

  /**
   * Sets the metadata associated with the notebook.
   *
   * @param metadata: Notebook's metadata.
   */
  setMetadata(metadata: nbformat.INotebookMetadata): void {
    this.ymeta.set('metadata', JSONExt.deepCopy(metadata));
  }

  /**
   * Updates the metadata associated with the notebook.
   *
   * @param value: Metadata's attribute to update.
   */
  updateMetadata(value: Partial<nbformat.INotebookMetadata>): void {
    // TODO: Maybe modify only attributes instead of replacing the whole metadata?
    this.ymeta.set('metadata', Object.assign({}, this.getMetadata(), value));
  }

  /**
   * Handle a change to the ystate.
   */
  private _onMetaChanged = (event: Y.YMapEvent<any>) => {
    if (event.keysChanged.has('metadata')) {
      const change = event.changes.keys.get('metadata');
      const metadataChange = {
        oldValue: change?.oldValue ? change!.oldValue : undefined,
        newValue: this.getMetadata()
      };
      this._changed.emit({ metadataChange });
    }

    if (event.keysChanged.has('nbformat')) {
      const change = event.changes.keys.get('nbformat');
      const nbformatChanged = {
        key: 'nbformat',
        oldValue: change?.oldValue ? change!.oldValue : undefined,
        newValue: this.nbformat
      };
      this._changed.emit({ nbformatChanged });
    }

    if (event.keysChanged.has('nbformat_minor')) {
      const change = event.changes.keys.get('nbformat_minor');
      const nbformatChanged = {
        key: 'nbformat_minor',
        oldValue: change?.oldValue ? change!.oldValue : undefined,
        newValue: this.nbformat_minor
      };
      this._changed.emit({ nbformatChanged });
    }
  };

  /**
   * Handle a change to the ystate.
   */
  private _onStateChanged = (event: Y.YMapEvent<any>) => {
    const stateChange: any = [];
    event.keysChanged.forEach(key => {
      const change = event.changes.keys.get(key);
      if (change) {
        stateChange.push({
          name: key,
          oldValue: change.oldValue,
          newValue: this.ystate.get(key)
        });
      }
    });

    this._changed.emit({ stateChange });
  };

  /**
   * Handle a change to the list of cells.
   */
  private _onYCellsChanged = (event: Y.YArrayEvent<Y.Map<any>>) => {
    // update the type cell mapping by iterating through the added/removed types
    event.changes.added.forEach(item => {
      const type = (item.content as Y.ContentType).type as Y.Map<any>;
      if (!this._ycellMapping.has(type)) {
        this._ycellMapping.set(type, createCellModelFromSharedType(type));
      }
      const cell = this._ycellMapping.get(type) as any;
      cell._notebook = this;
      cell._undoManager = this.disableDocumentWideUndoRedo
        ? new Y.UndoManager([cell.ymodel], {})
        : this.undoManager;
    });
    event.changes.deleted.forEach(item => {
      const type = (item.content as Y.ContentType).type as Y.Map<any>;
      const model = this._ycellMapping.get(type);
      if (model) {
        model.dispose();
        this._ycellMapping.delete(type);
      }
    });
    let index = 0;
    // this reflects the event.changes.delta, but replaces the content of delta.insert with ycells
    const cellsChange: Delta<ISharedCell[]> = [];
    event.changes.delta.forEach((d: any) => {
      if (d.insert != null) {
        const insertedCells = d.insert.map((ycell: Y.Map<any>) =>
          this._ycellMapping.get(ycell)
        );
        cellsChange.push({ insert: insertedCells });
        this.cells.splice(index, 0, ...insertedCells);
        index += d.insert.length;
      } else if (d.delete != null) {
        cellsChange.push(d);
        this.cells.splice(index, d.delete);
      } else if (d.retain != null) {
        cellsChange.push(d);
        index += d.retain;
      }
    });

    this._changed.emit({
      cellsChange: cellsChange
    });
  };

  private _disableDocumentWideUndoRedo: boolean;
  private _defaultCell: nbformat.CellType;
  private _ycellMapping: WeakMap<Y.Map<any>, YCellType> = new WeakMap();
}

/**
 * Create a new shared cell model given the YJS shared type.
 */
export const createCellModelFromSharedType = (type: Y.Map<any>): YCellType => {
  switch (type.get('cell_type')) {
    case 'code':
      return new YCodeCell(type, type.get('source'));
    case 'markdown':
      return new YMarkdownCell(type, type.get('source'));
    case 'raw':
      return new YRawCell(type, type.get('source'));
    default:
      throw new Error('Found unknown cell type');
  }
};

/**
 * Create a new cell that can be inserted in an existing shared model.
 */
export const createCell = (
  cell: (
    | Partial<nbformat.IRawCell>
    | Partial<nbformat.ICodeCell>
    | Partial<nbformat.IMarkdownCell>
    | Partial<nbformat.IBaseCell>
  ) & { cell_type: 'markdown' | 'code' | 'raw' | string },
  factory = BoundCellFactory
): YCodeCell | YMarkdownCell | YRawCell => {
  switch (cell.cell_type) {
    case 'markdown': {
      const mCell = cell as Partial<nbformat.IMarkdownCell>;
      const ycell = factory.createMarkdownCell(mCell.id);
      if (mCell.source != null) {
        ycell.setSource(
          typeof mCell.source === 'string'
            ? mCell.source
            : mCell.source.join('\n')
        );
      }
      if (mCell.metadata != null) {
        ycell.setMetadata(mCell.metadata);
      }
      if (mCell.attachments != null) {
        ycell.setAttachments(mCell.attachments);
      }
      return ycell;
    }
    case 'code': {
      const cCell = cell as Partial<nbformat.ICodeCell>;
      const ycell = factory.createCodeCell(cCell.id);
      if (cCell.source != null) {
        ycell.setSource(
          typeof cCell.source === 'string'
            ? cCell.source
            : cCell.source.join('\n')
        );
      }
      if (cCell.metadata != null) {
        ycell.setMetadata(cCell.metadata);
      }
      if (cCell.execution_count != null) {
        ycell.execution_count = cCell.execution_count;
      }
      if (cCell.outputs) {
        ycell.setOutputs(cCell.outputs);
      }
      return ycell;
    }
    default: {
      // raw
      const rCell = cell as Partial<nbformat.IRawCell>;
      const ycell = factory.createRawCell(rCell.id);
      if (rCell.source != null) {
        ycell.setSource(
          typeof rCell.source === 'string'
            ? rCell.source
            : rCell.source.join('\n')
        );
      }
      if (rCell.metadata != null) {
        ycell.setMetadata(rCell.metadata);
      }
      if (rCell.attachments) {
        ycell.setAttachments(rCell.attachments);
      }
      return ycell;
    }
  }
};

/**
 * Create a new cell that can be inserted in an existing shared model.
 */
export const createStandaloneCell = (
  cell: (
    | Partial<nbformat.IRawCell>
    | Partial<nbformat.ICodeCell>
    | Partial<nbformat.IMarkdownCell>
  ) & { cell_type: 'markdown' | 'code' | 'raw' }
) => createCell(cell, StandaloneCellFactory);

class StandaloneCellFactory {
  static createMarkdownCell(id?: string) {
    return YMarkdownCell.createStandalone(id);
  }
  static createCodeCell(id?: string) {
    return YCodeCell.createStandalone(id);
  }
  static createRawCell(id?: string) {
    return YRawCell.createStandalone(id);
  }
}

class BoundCellFactory {
  static createMarkdownCell(id?: string) {
    return YMarkdownCell.create({ id });
  }
  static createCodeCell(id?: string) {
    return YCodeCell.create({ id });
  }
  static createRawCell(id?: string) {
    return YRawCell.create({ id });
  }
}

export class YBaseCell<Metadata extends ISharedBaseCellMetadata>
  implements ISharedBaseCell<Metadata>, IYText
{
  /**
   * Create a new YRawCell that can be inserted into a YNotebook
   */
  static create(options: ISharedCell.IOptions = {}): YBaseCell<any> {
    const ymodel = new Y.Map();
    const ysource = new Y.Text();
    ymodel.set('source', ysource);
    ymodel.set('metadata', {});
    ymodel.set('cell_type', this.prototype.cell_type);
    ymodel.set('id', options.id ?? UUID.uuid4());
    return new this(ymodel, ysource, options.isStandalone ?? false);
  }

  /**
   * Create a new YRawCell that works standalone. It cannot be
   * inserted into a YNotebook because the Yjs model is already
   * attached to an anonymous Y.Doc instance.
   */
  static createStandalone(id?: string): YBaseCell<any> {
    const cell = this.create({ id, isStandalone: true });
    const doc = new Y.Doc();
    doc.getArray().insert(0, [cell.ymodel]);
    cell._awareness = new Awareness(doc);
    cell._undoManager = new Y.UndoManager([cell.ymodel], {
      trackedOrigins: new Set([cell])
    });
    return cell;
  }

  constructor(ymodel: Y.Map<any>, ysource: Y.Text, isStandalone = false) {
    this.isStandalone = isStandalone;
    this.ymodel = ymodel;
    this._ysource = ysource;
    this._prevSourceLength = ysource ? ysource.length : 0;
    this.ymodel.observeDeep(this._modelObserver);
    this._awareness = null;
  }

  /**
   * Cell notebook awareness or null if the cell is standalone.
   */
  get awareness(): Awareness | null {
    return this._awareness ?? this.notebook?.awareness ?? null;
  }

  /**
   * The type of the cell.
   */
  get cell_type(): any {
    throw new Error('A YBaseCell must not be constructed');
  }

  /**
   * The changed signal.
   */
  get changed(): ISignal<this, CellChange<Metadata>> {
    return this._changed;
  }

  /**
   * Whether the model has been disposed or not.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Whether the cell is standalone or not.
   *
   * If the cell is standalone. It cannot be
   * inserted into a YNotebook because the Yjs model is already
   * attached to an anonymous Y.Doc instance.
   */
  readonly isStandalone: boolean;

  /**
   * The notebook that this cell belongs to.
   */
  get notebook(): YNotebook | null {
    return this._notebook;
  }

  /**
   * The cell undo manager.
   */
  get undoManager(): Y.UndoManager | null {
    if (!this.notebook) {
      return this._undoManager;
    }
    return this.notebook?.disableDocumentWideUndoRedo
      ? this._undoManager
      : this.notebook.undoManager;
  }
  set undoManager(undoManager: Y.UndoManager | null) {
    this._undoManager = undoManager;
  }

  readonly ymodel: Y.Map<any>;

  get ysource(): Y.Text {
    return this._ysource;
  }

  /**
   * Whether the object can undo changes.
   */
  canUndo(): boolean {
    return !!this.undoManager && this.undoManager.undoStack.length > 0;
  }

  /**
   * Whether the object can redo changes.
   */
  canRedo(): boolean {
    return !!this.undoManager && this.undoManager.redoStack.length > 0;
  }

  /**
   * Clear the change stack.
   */
  clearUndoHistory(): void {
    this.undoManager?.clear();
  }

  /**
   * Clone the cell.
   */
  clone(): YBaseCell<any> {
    const ymodel = new Y.Map();
    const ysource = new Y.Text(this.getSource());
    ymodel.set('source', ysource);
    ymodel.set('metadata', this.getMetadata());
    ymodel.set('cell_type', this.cell_type);
    ymodel.set('id', UUID.uuid4());
    const Self: any = this.constructor;
    const clone = new Self(ymodel, ysource);
    // TODO The assignment of the undoManager does not work for a clone.
    // See https://github.com/jupyterlab/jupyterlab/issues/11035
    clone._undoManager = this.undoManager;
    return clone;
  }

  /**
   * Undo an operation.
   */
  undo(): void {
    this.undoManager?.undo();
  }

  /**
   * Redo an operation.
   */
  redo(): void {
    this.undoManager?.redo();
  }

  /**
   * Dispose of the resources.
   */
  dispose(): void {
    if (this._isDisposed) return;
    this._isDisposed = true;
    this.ymodel.unobserveDeep(this._modelObserver);

    this._awareness?.destroy();
    if (!this.notebook && this._undoManager) {
      this._undoManager.destroy();
    }
    Signal.clearData(this);
  }

  /**
   * Gets the cell attachments.
   *
   * @returns The cell attachments.
   */
  getAttachments(): nbformat.IAttachments | undefined {
    return this.ymodel.get('attachments');
  }

  /**
   * Sets the cell attachments
   *
   * @param attachments: The cell attachments.
   */
  setAttachments(attachments: nbformat.IAttachments | undefined): void {
    this.transact(() => {
      if (attachments == null) {
        this.ymodel.delete('attachments');
      } else {
        this.ymodel.set('attachments', attachments);
      }
    });
  }

  /**
   * Get cell id.
   *
   * @returns Cell id
   */
  getId(): string {
    return this.ymodel.get('id');
  }

  /**
   * Gets cell's source.
   *
   * @returns Cell's source.
   */
  getSource(): string {
    return this.ysource.toString();
  }

  /**
   * Sets cell's source.
   *
   * @param value: New source.
   */
  setSource(value: string): void {
    this.transact(() => {
      this.ysource.delete(0, this.ysource.length);
      this.ysource.insert(0, value);
    });
    // @todo Do we need proper replace semantic? This leads to issues in editor bindings because they don't switch source.
    // this.ymodel.set('source', new Y.Text(value));
  }

  /**
   * Replace content from `start' to `end` with `value`.
   *
   * @param start: The start index of the range to replace (inclusive).
   *
   * @param end: The end index of the range to replace (exclusive).
   *
   * @param value: New source (optional).
   */
  updateSource(start: number, end: number, value = ''): void {
    this.transact(() => {
      const ysource = this.ysource;
      // insert and then delete.
      // This ensures that the cursor position is adjusted after the replaced content.
      ysource.insert(start, value);
      ysource.delete(start + value.length, end - start);
    });
  }

  /**
   * Returns the metadata associated with the notebook.
   *
   * @returns Notebook's metadata.
   */
  getMetadata(): Partial<Metadata> {
    return JSONExt.deepCopy(this.ymodel.get('metadata'));
  }

  /**
   * Sets the metadata associated with the notebook.
   *
   * @param metadata: Notebook's metadata.
   */
  setMetadata(value: Partial<Metadata>): void {
    const clone = JSONExt.deepCopy(value) as any;
    if (clone.collapsed != null) {
      clone.jupyter = clone.jupyter || {};
      (clone as any).jupyter.outputs_hidden = clone.collapsed;
    } else if (clone?.jupyter?.outputs_hidden != null) {
      clone.collapsed = clone.jupyter.outputs_hidden;
    }
    if (
      this.ymodel.doc == null ||
      !JSONExt.deepEqual(clone, this.getMetadata())
    ) {
      this.transact(() => {
        this.ymodel.set('metadata', clone);
      });
    }
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IBaseCell {
    return {
      id: this.getId(),
      cell_type: this.cell_type,
      source: this.getSource(),
      metadata: this.getMetadata()
    };
  }

  /**
   * Perform a transaction. While the function f is called, all changes to the shared
   * document are bundled into a single event.
   */
  transact(f: () => void, undoable = true): void {
    this.notebook && undoable
      ? this.notebook.transact(f)
      : this.ymodel.doc == null
      ? f()
      : this.ymodel.doc.transact(f, this);
  }

  /**
   * Handle a change to the ymodel.
   */
  private _modelObserver = (events: Y.YEvent<any>[]) => {
    const changes: CellChange<Metadata> = {};
    const sourceEvent = events.find(
      event => event.target === this.ymodel.get('source')
    );
    if (sourceEvent) {
      changes.sourceChange = sourceEvent.changes.delta as any;
    }

    const outputEvent = events.find(
      event => event.target === this.ymodel.get('outputs')
    );
    if (outputEvent) {
      changes.outputsChange = outputEvent.changes.delta as any;
    }

    const modelEvent = events.find(event => event.target === this.ymodel) as
      | undefined
      | Y.YMapEvent<any>;
    if (modelEvent && modelEvent.keysChanged.has('metadata')) {
      const change = modelEvent.changes.keys.get('metadata');
      changes.metadataChange = {
        oldValue: change?.oldValue ? change!.oldValue : undefined,
        newValue: this.getMetadata()
      };
    }

    if (modelEvent && modelEvent.keysChanged.has('execution_count')) {
      const change = modelEvent.changes.keys.get('execution_count');
      changes.executionCountChange = {
        oldValue: change!.oldValue,
        newValue: this.ymodel.get('execution_count')
      };
    }

    // The model allows us to replace the complete source with a new string. We express this in the Delta format
    // as a replace of the complete string.
    const ysource = this.ymodel.get('source');
    if (modelEvent && modelEvent.keysChanged.has('source')) {
      changes.sourceChange = [
        { delete: this._prevSourceLength },
        { insert: ysource.toString() }
      ];
    }
    this._prevSourceLength = ysource.length;
    this._changed.emit(changes);
  };

  /**
   * The notebook that this cell belongs to.
   */
  protected _notebook: YNotebook | null = null;
  private _awareness: Awareness | null;
  private _changed = new Signal<this, CellChange<Metadata>>(this);
  private _isDisposed = false;
  private _prevSourceLength: number;
  private _undoManager: Y.UndoManager | null = null;
  private _ysource: Y.Text;
}

/**
 * Shareable code cell.
 */
export class YCodeCell
  extends YBaseCell<ISharedBaseCellMetadata>
  implements ISharedCodeCell
{
  /**
   * Create a new YCodeCell that can be inserted into a YNotebook
   */
  static create(options: ISharedCell.IOptions = {}): YCodeCell {
    const cell = super.create(options) as YCodeCell;
    cell.ymodel.set('execution_count', null); // for some default value
    cell.ymodel.set('outputs', cell._youtputs);
    return cell;
  }

  /**
   * Create a new YCodeCell that works standalone. It cannot be
   * inserted into a YNotebook because the Yjs model is already
   * attached to an anonymous Y.Doc instance.
   */
  static createStandalone(id?: string): YCodeCell {
    return super.createStandalone(id) as YCodeCell;
  }

  constructor(
    ymodel: Y.Map<any>,
    ysource: Y.Text,
    isStandalone: boolean = false
  ) {
    super(ymodel, ysource, isStandalone);
    this._youtputs = new Y.Array();
  }

  /**
   * The type of the cell.
   */
  get cell_type(): 'code' {
    return 'code';
  }

  /**
   * The code cell's prompt number. Will be null if the cell has not been run.
   */
  get execution_count(): number | null {
    return this.ymodel.get('execution_count') || null;
  }
  set execution_count(count: number | null) {
    if (this.execution_count !== count) {
      this.transact(() => {
        this.ymodel.set('execution_count', count);
      });
    }
  }

  /**
   * Execution, display, or stream outputs.
   */
  getOutputs(): Array<nbformat.IOutput> {
    return JSONExt.deepCopy(this._youtputs.toArray());
  }

  /**
   * Replace all outputs.
   */
  setOutputs(outputs: Array<nbformat.IOutput>): void {
    this.transact(() => {
      this._youtputs.delete(0, this._youtputs.length);
      this._youtputs.insert(0, outputs);
    }, false);
  }

  /**
   * Replace content from `start' to `end` with `outputs`.
   *
   * @param start: The start index of the range to replace (inclusive).
   *
   * @param end: The end index of the range to replace (exclusive).
   *
   * @param outputs: New outputs (optional).
   */
  updateOutputs(
    start: number,
    end: number,
    outputs: Array<nbformat.IOutput> = []
  ): void {
    const fin =
      end < this._youtputs.length ? end - start : this._youtputs.length - start;
    this.transact(() => {
      this._youtputs.delete(start, fin);
      this._youtputs.insert(start, outputs);
    }, false);
  }

  /**
   * Create a new YCodeCell that can be inserted into a YNotebook
   */
  clone(): YCodeCell {
    const cell = super.clone() as YCodeCell;
    cell._youtputs.insert(0, this.getOutputs());
    cell.ymodel.set('execution_count', this.execution_count); // for some default value
    cell.ymodel.set('outputs', cell._youtputs);
    return cell as any;
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.ICodeCell {
    return {
      id: this.getId(),
      cell_type: 'code',
      source: this.getSource(),
      metadata: this.getMetadata(),
      outputs: this.getOutputs(),
      execution_count: this.execution_count
    };
  }

  private _youtputs: Y.Array<nbformat.IOutput>;
}

/**
 * Shareable raw cell.
 */
export class YRawCell
  extends YBaseCell<ISharedBaseCellMetadata>
  implements ISharedRawCell
{
  /**
   * Create a new YRawCell that can be inserted into a YNotebook
   */
  static create(options: ISharedCell.IOptions = {}): YRawCell {
    return super.create(options) as YRawCell;
  }

  /**
   * Create a new YRawCell that works standalone. It cannot be
   * inserted into a YNotebook because the Yjs model is already
   * attached to an anonymous Y.Doc instance.
   */
  static createStandalone(id?: string): YRawCell {
    return super.createStandalone(id) as YRawCell;
  }

  /**
   * String identifying the type of cell.
   */
  get cell_type(): 'raw' {
    return 'raw';
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IRawCell {
    return {
      id: this.getId(),
      cell_type: 'raw',
      source: this.getSource(),
      metadata: this.getMetadata(),
      attachments: this.getAttachments()
    };
  }
}

/**
 * Shareable markdown cell.
 */
export class YMarkdownCell
  extends YBaseCell<ISharedBaseCellMetadata>
  implements ISharedMarkdownCell
{
  /**
   * Create a new YMarkdownCell that can be inserted into a YNotebook
   */
  static create(options: ISharedCell.IOptions = {}): YMarkdownCell {
    return super.create(options) as any;
  }

  /**
   * Create a new YMarkdownCell that works standalone. It cannot be
   * inserted into a YNotebook because the Yjs model is already
   * attached to an anonymous Y.Doc instance.
   */
  static createStandalone(id?: string): YMarkdownCell {
    return super.createStandalone(id) as YMarkdownCell;
  }

  /**
   * String identifying the type of cell.
   */
  get cell_type(): 'markdown' {
    return 'markdown';
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IMarkdownCell {
    return {
      id: this.getId(),
      cell_type: 'markdown',
      source: this.getSource(),
      metadata: this.getMetadata(),
      attachments: this.getAttachments()
    };
  }
}
