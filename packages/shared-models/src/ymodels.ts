/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as nbformat from '@jupyterlab/nbformat';
import { UUID } from '@lumino/coreutils';
import { ISignal, Signal } from '@lumino/signaling';
import { Awareness } from 'y-protocols/awareness';
import * as Y from 'yjs';
import * as models from './api';
import { Delta, ISharedNotebook } from './api';

const deepCopy = (o: any) => JSON.parse(JSON.stringify(o));

/**
 * Abstract interface to define Shared Models that can be bound to a text editor using any existing
 * Yjs-based editor binding.
 */
export interface IYText extends models.ISharedText {
  readonly ysource: Y.Text;
  readonly awareness: Awareness | null;
  readonly undoManager: Y.UndoManager | null;
}

export type YCellType = YRawCell | YCodeCell | YMarkdownCell;

export class YDocument<T> implements models.ISharedDocument {
  get dirty(): boolean {
    return this.ystate.get('dirty');
  }

  set dirty(value: boolean) {
    this.transact(() => {
      this.ystate.set('dirty', value);
    }, false);
  }

  /**
   * Perform a transaction. While the function f is called, all changes to the shared
   * document are bundled into a single event.
   */
  transact(f: () => void, undoable = true): void {
    this.ydoc.transact(f, undoable ? this : null);
  }
  /**
   * Dispose of the resources.
   */
  dispose(): void {
    this.isDisposed = true;
    this.ydoc.destroy();
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
   * The changed signal.
   */
  get changed(): ISignal<this, T> {
    return this._changed;
  }

  public isDisposed = false;
  public ydoc = new Y.Doc();
  public source = this.ydoc.getText('source');
  public ystate: Y.Map<any> = this.ydoc.getMap('state');
  public undoManager = new Y.UndoManager([this.source], {
    trackedOrigins: new Set([this])
  });
  public awareness = new Awareness(this.ydoc);
  protected _changed = new Signal<this, T>(this);
}

export class YFile
  extends YDocument<models.FileChange>
  implements models.ISharedFile, models.ISharedText, IYText {
  constructor() {
    super();
    this.ysource.observe(this._modelObserver);
    this.ystate.observe(this._onStateChanged);
  }

  /**
   * Dispose of the resources.
   */
  dispose(): void {
    this.ysource.unobserve(this._modelObserver);
    this.ystate.unobserve(this._onStateChanged);
  }

  /**
   * Handle a change to the ymodel.
   */
  private _modelObserver = (event: Y.YTextEvent) => {
    const changes: models.FileChange = {};
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

  public static create(): YFile {
    const model = new YFile();
    model.dirty = false;
    return model;
  }

  /**
   * Gets cell's source.
   *
   * @returns Cell's source.
   */
  public getSource(): string {
    return this.ysource.toString();
  }

  /**
   * Sets cell's source.
   *
   * @param value: New source.
   */
  public setSource(value: string): void {
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
  public updateSource(start: number, end: number, value = ''): void {
    this.transact(() => {
      const ysource = this.ysource;
      // insert and then delete.
      // This ensures that the cursor position is adjusted after the replaced content.
      ysource.insert(start, value);
      ysource.delete(start + value.length, end - start);
    });
  }

  public ysource = this.ydoc.getText('source');
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
  extends YDocument<models.NotebookChange>
  implements models.ISharedNotebook {
  constructor(options: ISharedNotebook.IOptions) {
    super();
    this._disableDocumentWideUndoRedo = options.disableDocumentWideUndoRedo;
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

  get nbformat(): number {
    return this.ymeta.get('nbformat');
  }

  set nbformat(value: number) {
    this.transact(() => {
      this.ymeta.set('nbformat', value);
    }, false);
  }

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
    this.ycells.unobserve(this._onYCellsChanged);
    this.ymeta.unobserve(this._onMetaChanged);
    this.ystate.unobserve(this._onStateChanged);
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
    });
  }

  /**
   * Returns the metadata associated with the notebook.
   *
   * @returns Notebook's metadata.
   */
  getMetadata(): nbformat.INotebookMetadata {
    const meta = this.ymeta.get('metadata');
    return meta ? deepCopy(meta) : {};
  }

  /**
   * Sets the metadata associated with the notebook.
   *
   * @param metadata: Notebook's metadata.
   */
  setMetadata(value: nbformat.INotebookMetadata): void {
    this.ymeta.set('metadata', deepCopy(value));
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
   * Create a new YNotebook.
   */
  public static create(
    disableDocumentWideUndoRedo: boolean
  ): models.ISharedNotebook {
    const model = new YNotebook({ disableDocumentWideUndoRedo });
    model.dirty = false;
    return model;
  }

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
   * Handle a change to the list of cells.
   */
  private _onYCellsChanged = (event: Y.YArrayEvent<Y.Map<any>>) => {
    // update the type⇔cell mapping by iterating through the added/removed types
    event.changes.added.forEach(item => {
      const type = (item.content as Y.ContentType).type as Y.Map<any>;
      if (!this._ycellMapping.has(type)) {
        this._ycellMapping.set(type, createCellModelFromSharedType(type));
      }
      const cell = this._ycellMapping.get(type) as any;
      cell._notebook = this;
      if (!this.disableDocumentWideUndoRedo) {
        cell._undoManager = this.undoManager;
      } else {
        cell._undoManager = new Y.UndoManager([cell.ymodel], {});
      }
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
    const cellsChange: Delta<models.ISharedCell[]> = [];
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

  public ycells: Y.Array<Y.Map<any>> = this.ydoc.getArray('cells');
  public ymeta: Y.Map<any> = this.ydoc.getMap('meta');
  public ymodel: Y.Map<any> = this.ydoc.getMap('model');
  public undoManager = new Y.UndoManager([this.ycells], {
    trackedOrigins: new Set([this])
  });
  private _disableDocumentWideUndoRedo: boolean;
  private _ycellMapping: Map<Y.Map<any>, YCellType> = new Map();
  public cells: YCellType[];
}

/**
 * Create a new shared cell model given the YJS shared type.
 */
export const createCellModelFromSharedType = (type: Y.Map<any>): YCellType => {
  switch (type.get('cell_type')) {
    case 'code':
      return new YCodeCell(type);
    case 'markdown':
      return new YMarkdownCell(type);
    case 'raw':
      return new YRawCell(type);
    default:
      throw new Error('Found unknown cell type');
  }
};

/**
 * Create a new standalone cell given the type.
 */
export const createStandaloneCell = (
  cellType: 'raw' | 'code' | 'markdown',
  id?: string
): YCellType => {
  switch (cellType) {
    case 'markdown':
      return YMarkdownCell.createStandalone(id);
    case 'code':
      return YCodeCell.createStandalone(id);
    default:
      // raw
      return YRawCell.createStandalone(id);
  }
};

export class YBaseCell<Metadata extends models.ISharedBaseCellMetadata>
  implements models.ISharedBaseCell<Metadata>, IYText {
  constructor(ymodel: Y.Map<any>) {
    this.ymodel = ymodel;
    const ysource = ymodel.get('source');
    this._prevSourceLength = ysource ? ysource.length : 0;
    this.ymodel.observeDeep(this._modelObserver);
    this._awareness = null;
  }

  get ysource(): Y.Text {
    return this.ymodel.get('source');
  }

  get awareness(): Awareness | null {
    return this._awareness ?? this.notebook?.awareness ?? null;
  }

  /**
   * Perform a transaction. While the function f is called, all changes to the shared
   * document are bundled into a single event.
   */
  transact(f: () => void, undoable = true): void {
    this.notebook && undoable
      ? this.notebook.transact(f)
      : this.ymodel.doc!.transact(f, this);
  }

  /**
   * The notebook that this cell belongs to.
   */
  get undoManager(): Y.UndoManager | null {
    if (!this.notebook) {
      return this._undoManager;
    }
    return this.notebook?.disableDocumentWideUndoRedo
      ? this._undoManager
      : this.notebook.undoManager;
  }

  /**
   * Set the undoManager when adding new cells.
   */
  set undoManager(undoManager: Y.UndoManager | null) {
    this._undoManager = undoManager;
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
   * The notebook that this cell belongs to.
   */
  get notebook(): YNotebook | null {
    return this._notebook;
  }

  /**
   * The notebook that this cell belongs to.
   */
  protected _notebook: YNotebook | null = null;

  /**
   * Whether the cell is standalone or not.
   *
   * If the cell is standalone. It cannot be
   * inserted into a YNotebook because the Yjs model is already
   * attached to an anonymous Y.Doc instance.
   */
  isStandalone = false;

  /**
   * Create a new YRawCell that can be inserted into a YNotebook
   */
  public static create(id = UUID.uuid4()): YBaseCell<any> {
    const ymodel = new Y.Map();
    const ysource = new Y.Text();
    ymodel.set('source', ysource);
    ymodel.set('metadata', {});
    ymodel.set('cell_type', this.prototype.cell_type);
    ymodel.set('id', id);
    return new this(ymodel);
  }

  /**
   * Create a new YRawCell that works standalone. It cannot be
   * inserted into a YNotebook because the Yjs model is already
   * attached to an anonymous Y.Doc instance.
   */
  public static createStandalone(id?: string): YBaseCell<any> {
    const cell = this.create(id);
    cell.isStandalone = true;
    const doc = new Y.Doc();
    doc.getArray().insert(0, [cell.ymodel]);
    cell._awareness = new Awareness(doc);
    cell._undoManager = new Y.UndoManager([cell.ymodel], {
      trackedOrigins: new Set([cell])
    });
    return cell;
  }

  /**
   * Clone the cell.
   *
   * @todo clone should only be available in the specific implementations i.e. ISharedCodeCell
   */
  public clone(): YBaseCell<any> {
    const ymodel = new Y.Map();
    const ysource = new Y.Text(this.getSource());
    ymodel.set('source', ysource);
    ymodel.set('metadata', this.getMetadata());
    ymodel.set('cell_type', this.cell_type);
    ymodel.set('id', this.getId());
    const Self: any = this.constructor;
    const clone = new Self(ymodel);
    // TODO The assignment of the undoManager does not work for a clone.
    // See https://github.com/jupyterlab/jupyterlab/issues/11035
    clone._undoManager = this.undoManager;
    return clone;
  }

  /**
   * Handle a change to the ymodel.
   */
  private _modelObserver = (events: Y.YEvent<any>[]) => {
    const changes: models.CellChange<Metadata> = {};
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
   * The changed signal.
   */
  get changed(): ISignal<this, models.CellChange<Metadata>> {
    return this._changed;
  }

  /**
   * Dispose of the resources.
   */
  dispose(): void {
    this.ymodel.unobserveDeep(this._modelObserver);
  }

  /**
   * Gets the cell attachments.
   *
   * @returns The cell attachments.
   */
  public getAttachments(): nbformat.IAttachments | undefined {
    return this.ymodel.get('attachments');
  }

  /**
   * Sets the cell attachments
   *
   * @param attachments: The cell attachments.
   */
  public setAttachments(attachments: nbformat.IAttachments | undefined): void {
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
  public getId(): string {
    return this.ymodel.get('id');
  }

  /**
   * Gets cell's source.
   *
   * @returns Cell's source.
   */
  public getSource(): string {
    return this.ymodel.get('source').toString();
  }

  /**
   * Sets cell's source.
   *
   * @param value: New source.
   */
  public setSource(value: string): void {
    const ytext = this.ymodel.get('source');
    this.transact(() => {
      ytext.delete(0, ytext.length);
      ytext.insert(0, value);
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
  public updateSource(start: number, end: number, value = ''): void {
    this.transact(() => {
      const ysource = this.ysource;
      // insert and then delete.
      // This ensures that the cursor position is adjusted after the replaced content.
      ysource.insert(start, value);
      ysource.delete(start + value.length, end - start);
    });
  }

  /**
   * The type of the cell.
   */
  get cell_type(): any {
    throw new Error('A YBaseCell must not be constructed');
  }

  /**
   * Returns the metadata associated with the notebook.
   *
   * @returns Notebook's metadata.
   */
  getMetadata(): Partial<Metadata> {
    return deepCopy(this.ymodel.get('metadata'));
  }

  /**
   * Sets the metadata associated with the notebook.
   *
   * @param metadata: Notebook's metadata.
   */
  setMetadata(value: Partial<Metadata>): void {
    this.transact(() => {
      this.ymodel.set('metadata', deepCopy(value));
    });
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

  public isDisposed = false;
  public ymodel: Y.Map<any>;
  private _undoManager: Y.UndoManager | null = null;
  private _changed = new Signal<this, models.CellChange<Metadata>>(this);
  private _prevSourceLength: number;
  private _awareness: Awareness | null;
}

export class YCodeCell
  extends YBaseCell<models.ISharedBaseCellMetadata>
  implements models.ISharedCodeCell {
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
    return this.ymodel.get('execution_count');
  }

  /**
   * The code cell's prompt number. Will be null if the cell has not been run.
   */
  set execution_count(count: number | null) {
    this.transact(() => {
      this.ymodel.set('execution_count', count);
    });
  }

  /**
   * Execution, display, or stream outputs.
   */
  getOutputs(): Array<nbformat.IOutput> {
    return deepCopy(this.ymodel.get('outputs').toArray());
  }

  /**
   * Replace all outputs.
   */
  setOutputs(outputs: Array<nbformat.IOutput>): void {
    const youtputs = this.ymodel.get('outputs') as Y.Array<nbformat.IOutput>;
    this.transact(() => {
      youtputs.delete(0, youtputs.length);
      youtputs.insert(0, outputs);
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
    const youtputs = this.ymodel.get('outputs') as Y.Array<nbformat.IOutput>;
    const fin = end < youtputs.length ? end - start : youtputs.length - start;
    this.transact(() => {
      youtputs.delete(start, fin);
      youtputs.insert(start, outputs);
    }, false);
  }

  /**
   * Create a new YCodeCell that can be inserted into a YNotebook
   */
  public static create(id?: string): YCodeCell {
    const cell = super.create(id);
    cell.ymodel.set('execution_count', 0); // for some default value
    cell.ymodel.set('outputs', new Y.Array<nbformat.IOutput>());
    return cell as any;
  }

  /**
   * Create a new YCodeCell that works standalone. It cannot be
   * inserted into a YNotebook because the Yjs model is already
   * attached to an anonymous Y.Doc instance.
   */
  public static createStandalone(id?: string): YCodeCell {
    const cell = super.createStandalone(id);
    cell.ymodel.set('execution_count', null); // for some default value
    cell.ymodel.set('outputs', new Y.Array<nbformat.IOutput>());
    return cell as any;
  }

  /**
   * Create a new YCodeCell that can be inserted into a YNotebook
   *
   * @todo clone should only be available in the specific implementations i.e. ISharedCodeCell
   */
  public clone(): YCodeCell {
    const cell = super.clone();
    const youtputs = new Y.Array<nbformat.IOutput>();
    youtputs.insert(0, this.getOutputs());
    cell.ymodel.set('execution_count', this.execution_count); // for some default value
    cell.ymodel.set('outputs', youtputs);
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
}

export class YRawCell
  extends YBaseCell<models.ISharedBaseCellMetadata>
  implements models.ISharedRawCell {
  /**
   * Create a new YRawCell that can be inserted into a YNotebook
   */
  public static create(id?: string): YRawCell {
    return super.create(id) as any;
  }

  /**
   * Create a new YRawCell that works standalone. It cannot be
   * inserted into a YNotebook because the Yjs model is already
   * attached to an anonymous Y.Doc instance.
   */
  public static createStandalone(id?: string): YRawCell {
    return super.createStandalone(id) as any;
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

export class YMarkdownCell
  extends YBaseCell<models.ISharedBaseCellMetadata>
  implements models.ISharedMarkdownCell {
  /**
   * Create a new YMarkdownCell that can be inserted into a YNotebook
   */
  public static create(id?: string): YMarkdownCell {
    return super.create(id) as any;
  }

  /**
   * Create a new YMarkdownCell that works standalone. It cannot be
   * inserted into a YNotebook because the Yjs model is already
   * attached to an anonymous Y.Doc instance.
   */
  public static createStandalone(id?: string): YMarkdownCell {
    return super.createStandalone(id) as any;
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

export default YNotebook;
