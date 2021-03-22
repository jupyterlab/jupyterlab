/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { ISignal, Signal } from '@lumino/signaling';

import * as nbformat from '@jupyterlab/nbformat';

import * as nbmodel from './api';

import * as Y from 'yjs';

// @ts-ignore
import { Awareness } from 'y-protocols/dist/awareness.cjs';

const deepCopy = (o: any) => JSON.parse(JSON.stringify(o));

type YCellType = YRawCell | YCodeCell | YRawCell | YMarkdownCell;

/**
 * Shared implementation of the nbmodel types.
 */
export class YNotebook implements nbmodel.ISharedNotebook {
  constructor() {
    this.ycells.observe(this._onYCellsChanged);
    this.cells = this.ycells.toArray().map(ycell => {
      if (!this.ycellMapping.has(ycell)) {
        this.ycellMapping.set(ycell, this._createCellFromType(ycell));
      }
      return this.ycellMapping.get(ycell) as YCellType;
    });
  }
  getCell(index: number): YCellType {
    return this.cells[index];
  }
  insertCell(index: number, cell: YCellType): void {
    this.insertCells(index, [cell]);
  }
  insertCells(index: number, cells: YCellType[]): void {
    cells.forEach(cell => {
      this.ycellMapping.set(cell.ymodel, cell);
      // cell.yawareness = this.yawareness;
      // cell.yUndoManager = this.yUndoManager;
    });
    this.ydoc.transact(() => {
      this.ycells.insert(
        index,
        cells.map(cell => cell.ymodel)
      );
    }, this);
  }
  moveCell(fromIndex: number, toIndex: number): void {
    this.ydoc.transact(() => {
      const fromCell = this.getCell(fromIndex).clone();
      this.deleteCell(fromIndex);
      this.insertCell(toIndex, fromCell);
    }, this);
  }
  deleteCell(index: number): void {
    this.ydoc.transact(() => {
      this.ycells.delete(index, length);
    }, this);
  }
  undo(): void {
    this.undoManager.undo();
  }
  redo(): void {
    this.undoManager.redo();
  }

  get changed(): ISignal<this, nbmodel.NotebookChange> {
    return this._changed;
  }

  dispose(): void {
    this.ycells.unobserve(this._onYCellsChanged);
  }

  private _onYCellsChanged = (event: Y.YArrayEvent<Y.Map<any>>) => {
    // update the type⇔cell mapping by iterating through the addded/removed types
    event.changes.added.forEach(item => {
      const type = (item.content as Y.ContentType).type as Y.Map<any>;
      if (!this.ycellMapping.has(type)) {
        this.ycellMapping.set(type, this._createCellFromType(type));
      }
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
    event.changes.delta.forEach((d: any) => {
      if (d.insert != null) {
        this.cells.splice(
          index,
          0,
          ...d.insert.map((ycell: Y.Map<any>) => this.ycellMapping.get(ycell))
        );
        index += d.insert.length;
      }
      if (d.delete != null) {
        this.cells.splice(index, index + d.delete);
      } else if (d.retain != null) {
        index += d.retain;
      }
    });

    this._changed.emit({
      cellsChange: event.changes.delta as any
    });
  };

  private _createCellFromType(type: Y.Map<any>): YCellType {
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
  }

  public ydoc = new Y.Doc();
  public awareness = new Awareness(this.ydoc);
  public ycells: Y.Array<Y.Map<any>> = this.ydoc.getArray('cells');
  public ymeta: Y.Map<any> = this.ydoc.getMap('meta');
  public undoManager = new Y.UndoManager(this.ycells, {
    trackedOrigins: new Set([this])
  });
  public ycellMapping: Map<Y.Map<any>, YCellType> = new Map();
  public getMetadata(): nbformat.INotebookMetadata {
    const meta = this.ymeta.get('metadata');
    return meta ? deepCopy(meta) : { orig_nbformat: 1 };
  }
  public setMetadata(value: nbformat.INotebookMetadata): void {
    this.ymeta.set('metadata', deepCopy(value));
  }
  public updateMetadata(value: Partial<nbformat.INotebookMetadata>): void {
    this.ymeta.set('metadata', Object.assign({}, this.getMetadata(), value));
  }
  public nbformat_minor: number = nbformat.MINOR_VERSION;
  public nbformat: number = nbformat.MAJOR_VERSION;
  public cells: YCellType[];
  public isDisposed = false;
  private _changed = new Signal<this, nbmodel.NotebookChange>(this);
}

export class YBaseCell<Metadata extends nbformat.IBaseCellMetadata>
  implements nbmodel.ISharedBaseCell<Metadata> {
  constructor(ymodel: Y.Map<any>) {
    this.ymodel = ymodel;
    const ysource = ymodel.get('source');
    this._prevSourceLength = ysource ? ysource.length : 0;
    this.ymodel.observeDeep(this._modelObserver);
  }

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
    new Y.Doc().getArray().insert(0, [cell.ymodel]);
    return cell;
  }

  public clone(): this {
    const ymodel = new Y.Map();
    this.ymodel.forEach((value, key) => {
      this.ymodel.set(key, value);
    });
    const Self: any = this.constructor;
    return new Self(ymodel);
  }

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
        oldValue: change!.oldValue,
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

  get changed(): ISignal<this, nbmodel.CellChange<Metadata>> {
    return this._changed;
  }

  dispose(): void {
    this.ymodel.observeDeep(this._modelObserver);
  }

  public getAttachments(): nbformat.IAttachments | undefined {
    return this.ymodel.get('attachments');
  }
  public setAttachments(value: nbformat.IAttachments | undefined): void {
    if (value == null) {
      this.ymodel.set('attachments', value);
    } else {
      this.ymodel.delete('attachments');
    }
  }
  public getSource(): string {
    return this.ymodel.get('source').toString();
  }
  public setSource(value: string): void {
    const ytext = this.ymodel.get('source');
    ytext.delete(0, ytext.length);
    ytext.insert(0, value);
    // @todo Do we need proper replace semantic? This leads to issues in editor bindings because they don't switch source.
    // this.ymodel.set('source', new Y.Text(value));
  }
  public updateSource(start: number, end: number, value = ''): void {
    this.ymodel.doc!.transact(() => {
      const ysource = this.ymodel.get('source');
      ysource.delete(start, end - start);
      ysource.insert(start, value);
    });
  }

  public get cell_type(): any {
    throw new Error('A YBaseCell must not be constructed');
  }

  getMetadata(): Partial<Metadata> {
    return deepCopy(this.ymodel.get('metadata'));
  }

  setMetadata(value: Partial<Metadata>): void {
    this.ymodel.set('metadata', deepCopy(value));
  }
  toJSON(): nbformat.IBaseCell {
    return {
      cell_type: this.cell_type,
      source: this.getSource(),
      metadata: this.getMetadata()
    };
  }
  public isDisposed = false;
  public ymodel: Y.Map<any>;
  private _changed = new Signal<this, nbmodel.CellChange<Metadata>>(this);
  private _prevSourceLength: number;
}

export class YCodeCell
  extends YBaseCell<nbformat.ICodeCellMetadata>
  implements nbmodel.ISharedCodeCell {
  get cell_type(): 'code' {
    return 'code';
  }
  get execution_count(): number {
    return 1;
  }
  getOutputs(): Array<nbformat.IOutput> {
    return this.outputs;
  }
  /**
   * Create a new YRawCell that can be inserted into a YNotebook
   */
  public static create(): YCodeCell {
    const ymodel = new Y.Map();
    const ysource = new Y.Text();
    ymodel.set('source', ysource);
    ymodel.set('metadata', {});
    ymodel.set('cell_type', this.prototype.cell_type);
    ymodel.set('execution_count', this.prototype.execution_count);
    return new this(ymodel);
  }
  /**
   * Create a new YRawCell that works standalone. It cannot be
   * inserted into a YNotebook because the Yjs model is already
   * attached to an anonymous Y.Doc instance.
   */
  public static createStandalone(): YCodeCell {
    const cell = this.create();
    new Y.Doc().getArray().insert(0, [cell.ymodel]);
    return cell;
  }
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
  extends YBaseCell<nbformat.IRawCellMetadata>
  implements nbmodel.ISharedRawCell {
  get cell_type(): 'raw' {
    return 'raw';
  }
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
  extends YBaseCell<nbformat.IRawCellMetadata>
  implements nbmodel.ISharedMarkdownCell {
  get cell_type(): 'markdown' {
    return 'markdown';
  }
  toJSON(): nbformat.IMarkdownCell {
    return {
      cell_type: 'markdown',
      source: this.getSource(),
      metadata: this.getMetadata(),
      attachments: this.getAttachments()
    };
  }
}

/**
 * Namespace for the factory methods.
 */
export namespace YNotebook {
  export const createSharedNotebook = (): nbmodel.ISharedNotebook => {
    return new YNotebook();
  };

  /**
   * Shared cells can be inserted into a SharedNotebook.
   *
   * Shared cells only start emitting events when they are connected to a SharedNotebook.
   */
  export const createSharedCodeCell = (): nbmodel.ISharedCodeCell => {
    return YCodeCell.create() as nbmodel.ISharedCodeCell;
  };
  export const createSharedMarkdownCell = (): nbmodel.ISharedMarkdownCell => {
    return YMarkdownCell.create() as nbmodel.ISharedMarkdownCell;
  };
  export const createSharedRawCell = (): nbmodel.ISharedRawCell => {
    return YRawCell.create() as nbmodel.ISharedRawCell;
  };

  /**
   * They "standalone" and must not be inserted into a (Shared)Notebook.
   *
   * Standalone cells emit events immediately after they have been created, but they must not
   * be included into a (Shared)Notebook.
   */
  export const createStandaloneCodeCell = (): nbmodel.ISharedCodeCell => {
    return YCodeCell.createStandalone() as nbmodel.ISharedCodeCell;
  };
  export const createStandaloneMarkdownCell = (): nbmodel.ISharedMarkdownCell => {
    return YMarkdownCell.createStandalone() as nbmodel.ISharedMarkdownCell;
  };
  export const createStandaloneRawCell = (): nbmodel.ISharedRawCell => {
    return YRawCell.createStandalone() as nbmodel.ISharedRawCell;
  };
}

export default YNotebook;
