/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { ISignal, Signal } from '@lumino/signaling';

import * as nbformat from '@jupyterlab/nbformat';

import * as nbmodel from './api';

import * as Y from 'yjs';

import { Awareness } from 'y-protocols/awareness.js';

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
  getCell(index: number): nbmodel.ISharedCell {
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
      cellsChange: event.changes.delta
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
  public get metadata(): nbformat.INotebookMetadata {
    return this.ymeta.get('metadata');
  }
  public set metadata(value: nbformat.INotebookMetadata) {
    this.ymeta.set('metadata', value);
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
    this.ysource = ymodel.get('source');
    this._prevSourceLength = this.ysource.length;
    this.ymodel.observeDeep(this._modelObserver);
  }

  /**
   * Create a new YRawCell that can be inserted into a YNotebook
   */
  protected static create(): YCellType {
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
  public static createStandalone(): YCellType {
    const cell = this.create();
    new Y.Doc().getArray().insert(0, [cell.ymodel]);
    return cell;
  }

  private _modelObserver = (events: Y.YEvent[]) => {
    const changes: nbmodel.CellChange<Metadata> = {};
    const sourceEvent = events.find(event => event.target === this.ysource);
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
        newValue: this.metadata
      };
    }
    // The model allows us to replace the complete source with a new string. We express this in the Delta format
    // as a replace of the complete string.
    if (modelEvent && modelEvent.keysChanged.has('source')) {
      this.ysource = this.ymodel.get('source');
      changes.sourceChange = [
        { delete: this._prevSourceLength },
        { insert: this.ysource.toString() }
      ];
    }
    this._prevSourceLength = this.ysource.length;
    this._changed.emit(changes);
  };

  get changed(): ISignal<this, nbmodel.CellChange<Metadata>> {
    return this._changed;
  }

  dispose(): void {
    this.ymodel.observeDeep(this._modelObserver);
  }

  public get attachments(): nbformat.IAttachments | undefined {
    return this.ymodel.get('attachments');
  }
  public set attachments(value: nbformat.IAttachments | undefined) {
    if (value == null) {
      this.ymodel.set('attachments', value);
    } else {
      this.ymodel.delete('attachments');
    }
  }
  public get source(): string {
    return this.ysource.toString();
  }
  public set source(value: string) {
    this.ysource = new Y.Text();
    this.ymodel.set('source', this.ysource);
  }

  public get cell_type(): any {
    throw new Error('A YBaseCell must not be constructed');
  }

  get metadata(): Partial<Metadata> {
    return this.ymodel.get('metadata');
  }
  set metadata(value: Partial<Metadata>) {
    this.ymodel.set('metadata', value);
  }
  public isDisposed = false;
  public ymodel: Y.Map<any>;
  public ysource: Y.Text;
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
  get outputs(): Array<any> {
    return [];
  }
}

export class YRawCell
  extends YBaseCell<nbformat.IRawCellMetadata>
  implements nbmodel.ISharedRawCell {
  get cell_type(): 'raw' {
    return 'raw';
  }
}

export class YMarkdownCell
  extends YBaseCell<nbformat.IRawCellMetadata>
  implements nbmodel.ISharedMarkdownCell {
  get cell_type(): 'markdown' {
    return 'markdown';
  }
}
