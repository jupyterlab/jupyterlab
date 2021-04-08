/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { ISignal, Signal } from '@lumino/signaling';

import * as Y from 'yjs';

import * as nbformat from '@jupyterlab/nbformat';

import * as nbmodel from './api';

import { Delta } from './api';

// @ts-ignore
import { Awareness } from 'y-protocols/dist/awareness.cjs';

const deepCopy = (o: any) => JSON.parse(JSON.stringify(o));

type YCellType = YRawCell | YCodeCell | YRawCell | YMarkdownCell;

/**
 * Shared implementation of the nbmodel types.
 *
 * Shared cells can be inserted into a SharedNotebook.
 * Shared cells only start emitting events when they are connected to a SharedNotebook.
 *
 * "Standalone" cells must not be inserted into a (Shared)Notebook.
 * Standalone cells emit events immediately after they have been created, but they must not
 * be included into a (Shared)Notebook.
 */
export class YNotebook implements nbmodel.ISharedNotebook {
  constructor() {
    this.ycells.observe(this._onYCellsChanged);
    this.cells = this.ycells.toArray().map(ycell => {
      if (!this.ycellMapping.has(ycell)) {
        this.ycellMapping.set(ycell, createCellFromType(ycell));
      }
      return this.ycellMapping.get(ycell) as YCellType;
    });
  }

  /**
   * Whether the object can undo changes.
   */
  get canUndo(): boolean {
    return this.undoManager.undoStack.length > 0;
  }

  /**
   * Whether the object can redo changes.
   */
  get canRedo(): boolean {
    return this.undoManager.redoStack.length > 0;
  }

  /**
   * Perform a transaction. While the function f is called, all changes to the shared
   * document are bundled into a single event.
   */
  transact(f: () => void, undoable = true): void {
    this.ydoc.transact(f, undoable ? this : null);
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
      this.ycellMapping.set(cell.ymodel, cell);
      // cell.yawareness = this.yawareness;
      // cell.yUndoManager = this.yUndoManager;
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
   * Create a new YNotebook.
   */
  public static create(): nbmodel.ISharedNotebook {
    return new YNotebook();
  }

  /**
   * The changed signal.
   */
  get changed(): ISignal<this, nbmodel.NotebookChange> {
    return this._changed;
  }

  /**
   * Dispose of the resources.
   */
  dispose(): void {
    this.ycells.unobserve(this._onYCellsChanged);
  }

  /**
   * Handle a change to the list of cells.
   */
  private _onYCellsChanged = (event: Y.YArrayEvent<Y.Map<any>>) => {
    // update the type⇔cell mapping by iterating through the addded/removed types
    event.changes.added.forEach(item => {
      const type = (item.content as Y.ContentType).type as Y.Map<any>;
      if (!this.ycellMapping.has(type)) {
        this.ycellMapping.set(type, createCellFromType(type));
      }
      const cell = this.ycellMapping.get(type) as any;
      cell._notebook = this;
      cell._undoManager = this.undoManager;
    });
    event.changes.deleted.forEach(item => {
      const type = (item.content as Y.ContentType).type as Y.Map<any>;
      const model = this.ycellMapping.get(type);
      if (model) {
        model.dispose();
        this.ycellMapping.delete(type);
      }
    });
    let index = 0;
    // this reflects the event.changes.delta, but replaces the content of delta.insert with nbcells.
    const cellsChange: Delta<nbmodel.ISharedCell[]> = [];
    event.changes.delta.forEach((d: any) => {
      if (d.insert != null) {
        const insertedCells = d.insert.map((ycell: Y.Map<any>) =>
          this.ycellMapping.get(ycell)
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

  public ydoc = new Y.Doc();
  public awareness = new Awareness(this.ydoc);
  public ycells: Y.Array<Y.Map<any>> = this.ydoc.getArray('cells');
  public ymeta: Y.Map<any> = this.ydoc.getMap('meta');
  public undoManager = new Y.UndoManager([this.ycells], {
    trackedOrigins: new Set([this])
  });
  public ycellMapping: Map<Y.Map<any>, YCellType> = new Map();

  /**
   * Returns the metadata associated with the notebook.
   *
   * @returns Notebook's metadata.
   */
  getMetadata(): nbformat.INotebookMetadata {
    const meta = this.ymeta.get('metadata');
    return meta ? deepCopy(meta) : { orig_nbformat: 1 };
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
    this.ymeta.set('metadata', Object.assign({}, this.getMetadata(), value));
  }

  public nbformat_minor: number = nbformat.MINOR_VERSION;
  public nbformat: number = nbformat.MAJOR_VERSION;
  public cells: YCellType[];
  public isDisposed = false;
  private _changed = new Signal<this, nbmodel.NotebookChange>(this);
}

/**
 * Create a new shared cell given the type.
 */
export const createCellFromType = (type: Y.Map<any>): YCellType => {
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
  cellType: 'raw' | 'code' | 'markdown'
): YCellType => {
  switch (cellType) {
    case 'markdown':
      return YMarkdownCell.createStandalone();
    case 'code':
      return YCodeCell.createStandalone();
    default:
      // raw
      return YRawCell.createStandalone();
  }
};

export class YBaseCell<Metadata extends nbmodel.ISharedBaseCellMetada>
  implements nbmodel.ISharedBaseCell<Metadata> {
  constructor(ymodel: Y.Map<any>) {
    this.ymodel = ymodel;
    const ysource = ymodel.get('source');
    this._prevSourceLength = ysource ? ysource.length : 0;
    this.ymodel.observeDeep(this._modelObserver);
  }

  /**
   * Perform a transaction. While the function f is called, all changes to the shared
   * document are bundled into a single event.
   */
  public transact(f: () => void, undoable = true): void {
    this.notebook && undoable
      ? this.notebook.transact(f)
      : this.ymodel.doc!.transact(f, this);
  }

  /**
   * The notebook that this cell belongs to.
   */
  get undoManager(): Y.UndoManager | null {
    return this.notebook ? this.notebook.undoManager : this._undoManager;
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
  public static create(): YBaseCell<any> {
    const ymodel = new Y.Map();
    const ysource = new Y.Text();
    ymodel.set('source', ysource);
    ymodel.set('metadata', {});
    ymodel.set('cell_type', this.prototype.cell_type);
    return new this(ymodel);
  }

  /**
   * Create a new YRawCell that works standalone. It cannot be
   * inserted into a YNotebook because the Yjs model is already
   * attached to an anonymous Y.Doc instance.
   */
  public static createStandalone(): YBaseCell<any> {
    const cell = this.create();
    cell.isStandalone = true;
    new Y.Doc().getArray().insert(0, [cell.ymodel]);
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
    const Self: any = this.constructor;
    return new Self(ymodel);
  }

  /**
   * Handle a change to the ymodel.
   */
  private _modelObserver = (events: Y.YEvent[]) => {
    const changes: nbmodel.CellChange<Metadata> = {};
    const sourceEvent = events.find(
      event => event.target === this.ymodel.get('source')
    );
    if (sourceEvent) {
      changes.sourceChange = sourceEvent.changes.delta as any;
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
  get changed(): ISignal<this, nbmodel.CellChange<Metadata>> {
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
   * @param attchments: The cell attachments.
   */
  public setAttachments(value: nbformat.IAttachments | undefined): void {
    this.transact(() => {
      if (value == null) {
        this.ymodel.set('attachments', value);
      } else {
        this.ymodel.delete('attachments');
      }
    });
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
      const ysource = this.ymodel.get('source');
      ysource.delete(start, end - start);
      ysource.insert(start, value);
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
      cell_type: this.cell_type,
      source: this.getSource(),
      metadata: this.getMetadata()
    };
  }

  public isDisposed = false;
  public ymodel: Y.Map<any>;
  private _undoManager: Y.UndoManager | null = null;
  private _changed = new Signal<this, nbmodel.CellChange<Metadata>>(this);
  private _prevSourceLength: number;
}

export class YCodeCell
  extends YBaseCell<nbmodel.ISharedBaseCellMetada>
  implements nbmodel.ISharedCodeCell {
  /**
   * The type of the cell.
   */
  get cell_type(): 'code' {
    return 'code';
  }

  /**
   * The code cell's prompt number. Will be null if the cell has not been run.
   */
  get execution_count(): number {
    return 1;
  }

  /**
   * Execution, display, or stream outputs.
   */
  getOutputs(): Array<nbformat.IOutput> {
    return this.outputs;
  }

  /**
   * Create a new YCodeCell that can be inserted into a YNotebook
   */
  public static create(): YCodeCell {
    const cell = super.create();
    cell.ymodel.set('execution_count', 0); // for some default value
    return cell as any;
  }

  /**
   * Create a new YCodeCell that works standalone. It cannot be
   * inserted into a YNotebook because the Yjs model is already
   * attached to an anonymous Y.Doc instance.
   */
  public static createStandalone(): YCodeCell {
    const cell = super.createStandalone();
    cell.ymodel.set('execution_count', null); // for some default value
    return cell as any;
  }

  /**
   * Create a new YCodeCell that can be inserted into a YNotebook
   *
   * @todo clone should only be available in the specific implementations i.e. ISharedCodeCell
   */
  public clone(): YCodeCell {
    const cell = super.clone();
    cell.ymodel.set('execution_count', this.execution_count); // for some default value
    return cell as any;
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.ICodeCell {
    return {
      cell_type: 'code',
      source: this.getSource(),
      metadata: this.getMetadata(),
      outputs: this.getOutputs(),
      execution_count: this.execution_count
    };
  }

  private outputs: Array<nbformat.IOutput> = [];
}

export class YRawCell
  extends YBaseCell<nbmodel.ISharedBaseCellMetada>
  implements nbmodel.ISharedRawCell {
  /**
   * Create a new YRawCell that can be inserted into a YNotebook
   */
  public static create(): YRawCell {
    return super.create() as any;
  }

  /**
   * Create a new YRawCell that works standalone. It cannot be
   * inserted into a YNotebook because the Yjs model is already
   * attached to an anonymous Y.Doc instance.
   */
  public static createStandalone(): YRawCell {
    return super.createStandalone() as any;
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
      cell_type: 'raw',
      source: this.getSource(),
      metadata: this.getMetadata(),
      attachments: this.getAttachments()
    };
  }
}

export class YMarkdownCell
  extends YBaseCell<nbmodel.ISharedBaseCellMetada>
  implements nbmodel.ISharedMarkdownCell {
  /**
   * Create a new YMarkdownCell that can be inserted into a YNotebook
   */
  public static create(): YMarkdownCell {
    return super.create() as any;
  }

  /**
   * Create a new YMarkdownCell that works standalone. It cannot be
   * inserted into a YNotebook because the Yjs model is already
   * attached to an anonymous Y.Doc instance.
   */
  public static createStandalone(): YMarkdownCell {
    return super.createStandalone() as any;
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
      cell_type: 'markdown',
      source: this.getSource(),
      metadata: this.getMetadata(),
      attachments: this.getAttachments()
    };
  }
}

export default YNotebook;
