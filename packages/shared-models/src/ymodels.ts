/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import type * as nbformat from '@jupyterlab/nbformat';
import {
  JSONExt,
  JSONObject,
  JSONValue,
  PartialJSONValue,
  UUID
} from '@lumino/coreutils';
import { ISignal, Signal } from '@lumino/signaling';
import { Awareness } from 'y-protocols/awareness';
import * as Y from 'yjs';
import type {
  CellChange,
  Delta,
  DocumentChange,
  FileChange,
  IMapChange,
  ISharedAttachmentsCell,
  ISharedBaseCell,
  ISharedCell,
  ISharedCodeCell,
  ISharedDocument,
  ISharedFile,
  ISharedMarkdownCell,
  ISharedNotebook,
  ISharedRawCell,
  ISharedText,
  NotebookChange,
  SharedCell,
  StateChange
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
 * Generic shareable document.
 */
export class YDocument<T extends DocumentChange> implements ISharedDocument {
  constructor() {
    this.ystate.observe(this.onStateChanged);
  }

  /**
   * YJS document
   */
  readonly ydoc = new Y.Doc();

  /**
   * Shared state
   */
  readonly ystate: Y.Map<any> = this.ydoc.getMap('state');

  /**
   * YJS document undo manager
   */
  readonly undoManager = new Y.UndoManager([], {
    trackedOrigins: new Set([this]),
    doc: this.ydoc
  });

  /**
   * Shared awareness
   */
  readonly awareness = new Awareness(this.ydoc);

  /**
   * The changed signal.
   */
  get changed(): ISignal<this, T> {
    return this._changed;
  }

  /**
   * Whether the document is disposed or not.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Document state
   */
  get state(): JSONObject {
    return JSONExt.deepCopy(this.ystate.toJSON());
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
    this.ystate.unobserve(this.onStateChanged);
    this.awareness.destroy();
    this.undoManager.destroy();
    this.ydoc.destroy();
    Signal.clearData(this);
  }

  /**
   * Get the value for a state attribute
   *
   * @param key Key to get
   */
  getState(key: string): JSONValue | undefined {
    const value = this.ystate.get(key);
    return typeof value === 'undefined'
      ? value
      : (JSONExt.deepCopy(value) as unknown as JSONValue);
  }

  /**
   * Set the value of a state attribute
   *
   * @param key Key to set
   * @param value New attribute value
   */
  setState(key: string, value: JSONValue): void {
    if (!JSONExt.deepEqual(this.ystate.get(key), value)) {
      this.ystate.set(key, value);
    }
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

  /**
   * Handle a change to the ystate.
   */
  protected onStateChanged = (event: Y.YMapEvent<any>): void => {
    const stateChange = new Array<StateChange<any>>();
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

    this._changed.emit({ stateChange } as any);
  };

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
   * @param source The initial file content
   *
   * @returns The file model
   */
  static create(source?: string): YFile {
    const model = new YFile();
    if (source) {
      model.source = source;
    }
    return model;
  }

  constructor() {
    super();
    this.undoManager.addToScope(this.ysource);
    this.ysource.observe(this._modelObserver);
  }

  /**
   * YJS file text.
   */
  readonly ysource = this.ydoc.getText('source');

  /**
   * File text
   */
  get source(): string {
    return this.getSource();
  }
  set source(v: string) {
    this.setSource(v);
  }

  /**
   * Dispose of the resources.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.ysource.unobserve(this._modelObserver);
    super.dispose();
  }

  /**
   * Get the file text.
   *
   * @returns File text.
   */
  getSource(): string {
    return this.ysource.toString();
  }

  /**
   * Set the file text.
   *
   * @param value New text
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
   * @param end: The end index of the range to replace (exclusive).
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
    this._changed.emit({ sourceChange: event.changes.delta as Delta<string> });
  };
}

/**
 * Create a new shared cell model given the YJS shared type.
 */
const createCellModelFromSharedType = (
  type: Y.Map<any>,
  options: SharedCell.IOptions = {}
): YCellType => {
  switch (type.get('cell_type')) {
    case 'code':
      return new YCodeCell(
        type,
        type.get('source'),
        type.get('outputs'),
        options
      );
    case 'markdown':
      return new YMarkdownCell(type, type.get('source'), options);
    case 'raw':
      return new YRawCell(type, type.get('source'), options);
    default:
      throw new Error('Found unknown cell type');
  }
};

/**
 * Create a new cell that can be inserted in an existing shared model.
 *
 * If no notebook is specified the cell will be standalone.
 *
 * @param cell Cell JSON representation
 * @param notebook Notebook to which the cell will be added
 */
const createCell = (
  cell: SharedCell.Cell,
  notebook?: YNotebook
): YCodeCell | YMarkdownCell | YRawCell => {
  const ymodel = new Y.Map();
  const ysource = new Y.Text();
  ymodel.set('source', ysource);
  ymodel.set('metadata', {});
  ymodel.set('cell_type', cell.cell_type);
  ymodel.set('id', cell.id ?? UUID.uuid4());

  let ycell: YCellType;
  switch (cell.cell_type) {
    case 'markdown': {
      ycell = new YMarkdownCell(ymodel, ysource, { notebook });
      if (cell.attachments != null) {
        ycell.setAttachments(cell.attachments as nbformat.IAttachments);
      }
      break;
    }
    case 'code': {
      const youtputs = new Y.Array();
      ymodel.set('outputs', youtputs);
      ycell = new YCodeCell(ymodel, ysource, youtputs, {
        notebook
      });
      const cCell = cell as Partial<nbformat.ICodeCell>;
      ycell.execution_count = cCell.execution_count ?? null;
      if (cCell.outputs) {
        ycell.setOutputs(cCell.outputs);
      }
      break;
    }
    default: {
      // raw
      ycell = new YRawCell(ymodel, ysource, { notebook });
      if (cell.attachments) {
        ycell.setAttachments(cell.attachments as nbformat.IAttachments);
      }
      break;
    }
  }

  if (cell.metadata != null) {
    ycell.setMetadata(cell.metadata);
  }
  if (cell.source != null) {
    ycell.setSource(
      typeof cell.source === 'string' ? cell.source : cell.source.join('\n')
    );
  }
  return ycell;
};

/**
 * Create a new cell that cannot be inserted in an existing shared model.
 *
 * @param cell Cell JSON representation
 */
export const createStandaloneCell = (cell: SharedCell.Cell): YCellType =>
  createCell(cell);

export class YBaseCell<Metadata extends nbformat.IBaseCellMetadata>
  implements ISharedBaseCell<Metadata>, IYText
{
  /**
   * Create a new YCell that works standalone. It cannot be
   * inserted into a YNotebook because the Yjs model is already
   * attached to an anonymous Y.Doc instance.
   */
  static createStandalone(id?: string): YBaseCell<any> {
    return createCell({ id, cell_type: this.prototype.cell_type });
  }

  /**
   * Base cell constructor
   *
   * ### Notes
   * Don't use the constructor directly - prefer using ``YNotebook.insertCell``
   *
   * The ``ysource`` is needed because ``ymodel.get('source')`` will
   * not return the real source if the model is not yet attached to
   * a document. Requesting it explicitly allows to introspect a non-empty
   * source before the cell is attached to the document.
   *
   * @param ymodel Cell map
   * @param ysource Cell source
   * @param options { notebook?: The notebook the cell is attached to }
   */
  constructor(
    ymodel: Y.Map<any>,
    ysource: Y.Text,
    options: SharedCell.IOptions = {}
  ) {
    this.ymodel = ymodel;
    this._ysource = ysource;
    this._prevSourceLength = ysource ? ysource.length : 0;
    this._notebook = null;
    this._awareness = null;
    this._undoManager = null;
    if (options.notebook) {
      this._notebook = options.notebook as YNotebook;
      // We cannot create a undo manager with the cell not yet attached in the notebook
      // so we defer that to the notebook insertCell method
    } else {
      // Standalone cell
      const doc = new Y.Doc();
      doc.getArray().insert(0, [this.ymodel]);
      this._awareness = new Awareness(doc);
      this._undoManager = new Y.UndoManager([this.ymodel], {
        trackedOrigins: new Set([this])
      });
    }

    this.ymodel.observeDeep(this._modelObserver);
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
   * Signal emitted when the cell is disposed.
   */
  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  /**
   * Cell id
   */
  get id(): string {
    return this.getId();
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
  get isStandalone(): boolean {
    return this._notebook !== null;
  }

  /**
   * Cell metadata.
   */
  get metadata(): Partial<Metadata> {
    return this.getMetadata();
  }
  set metadata(v: Partial<Metadata>) {
    this.setMetadata(v);
  }

  /**
   * Signal triggered when the cell metadata changes.
   */
  get metadataChanged(): ISignal<this, IMapChange> {
    return this._metadataChanged;
  }

  /**
   * The notebook that this cell belongs to.
   */
  get notebook(): YNotebook | null {
    return this._notebook;
  }

  /**
   * Cell input content.
   */
  get source(): string {
    return this.getSource();
  }
  set source(v: string) {
    this.setSource(v);
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

  /**
   * Defer setting the undo manager as it requires the
   * cell to be attached to the notebook Y document.
   */
  setUndoManager(): void {
    if (this._undoManager) {
      throw new Error('The cell undo manager is already set.');
    }

    if (this._notebook && this._notebook.disableDocumentWideUndoRedo) {
      this._undoManager = new Y.UndoManager([this.ymodel], {
        trackedOrigins: new Set([this])
      });
    }
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

    if (this._awareness) {
      // A new document is created for standalone cell.
      const doc = this._awareness.doc;
      this._awareness.destroy();
      doc.destroy();
    }
    if (this._undoManager) {
      // Be sure to not destroy the document undo manager.
      if (this._undoManager === this.notebook?.undoManager) {
        this._undoManager = null;
      } else {
        this._undoManager.destroy();
      }
    }
    this._disposed.emit();
    Signal.clearData(this);
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
   * Delete a metadata cell.
   *
   * @param key The key to delete
   */
  deleteMetadata(key: string): void {
    if (typeof this.getMetadata(key) === 'undefined') {
      return;
    }

    const allMetadata = JSONExt.deepCopy(this.ymodel.get('metadata'));
    delete allMetadata[key];
    if (key === 'collapsed' && allMetadata.jupyter) {
      delete allMetadata.jupyter.outputs_hidden;
      if (Object.keys(allMetadata.jupyter).length === 0) {
        delete allMetadata.jupyter;
      }
    } else if (key === 'jupyter') {
      delete allMetadata.collapsed;
    }
    this.setMetadata(allMetadata);
  }

  /**
   * Returns the metadata associated with the cell.
   *
   * @param key
   * @returns Cell metadata.
   */
  getMetadata(key?: string): Partial<Metadata> {
    const metadata = this.ymodel.get('metadata');

    if (typeof key === 'string') {
      const value = metadata[key];
      return typeof value === 'undefined'
        ? undefined // undefined is converted to `{}` by `JSONExt.deepCopy`
        : JSONExt.deepCopy(metadata[key]);
    } else {
      return JSONExt.deepCopy(metadata);
    }
  }

  /**
   * Sets some cell metadata.
   *
   * If only one argument is provided, it will override all cell metadata.
   * Otherwise a single key will be set to a new value.
   *
   * @param metadata Cell's metadata or key.
   * @param value Metadata value
   */
  setMetadata(
    metadata: Partial<Metadata> | string,
    value?: PartialJSONValue
  ): void {
    if (typeof metadata === 'string') {
      if (typeof value === 'undefined') {
        throw new TypeError(
          `Metadata value for ${metadata} cannot be 'undefined'; use deleteMetadata.`
        );
      }
      const key = metadata;

      // Only set metadata if we change something to avoid infinite
      // loop of signal changes.
      if (JSONExt.deepEqual((this.getMetadata(key) as any) ?? null, value)) {
        return;
      }

      const clone = this.getMetadata() as nbformat.ICellMetadata;
      clone[key] = value;
      if (key === 'collapsed' && clone.jupyter?.outputs_hidden !== value) {
        clone.jupyter = {
          ...clone.jupyter,
          outputs_hidden: value
        };
      } else if (key === 'jupyter') {
        if (typeof (value as JSONObject)['outputs_hidden'] !== 'undefined') {
          if (clone.collapsed !== (value as JSONObject)['outputs_hidden']) {
            clone.collapsed = (value as JSONObject)['outputs_hidden'];
          }
        } else {
          delete clone.collapsed;
        }
      }
      this.transact(() => {
        this.ymodel.set('metadata', clone);
      });
    } else {
      const clone = JSONExt.deepCopy(metadata) as any;
      if (clone.collapsed != null) {
        clone.jupyter = clone.jupyter || {};
        (clone as any).jupyter.outputs_hidden = clone.collapsed;
      } else if (clone?.jupyter?.outputs_hidden != null) {
        clone.collapsed = clone.jupyter.outputs_hidden;
      }
      if (!JSONExt.deepEqual(clone, this.getMetadata())) {
        this.transact(() => {
          this.ymodel.set('metadata', clone);
        });
      }
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
   * Extract changes from YJS events
   *
   * @param events YJS events
   * @returns Cell changes
   */
  protected getChanges(events: Y.YEvent<any>[]): Partial<CellChange<Metadata>> {
    const changes: CellChange<Metadata> = {};

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
      const metadataChange = (changes.metadataChange = {
        oldValue: change?.oldValue ? change!.oldValue : undefined,
        newValue: this.getMetadata()
      });

      const oldValue = metadataChange.oldValue ?? {};
      const oldKeys = Object.keys(oldValue);
      const newKeys = Object.keys(metadataChange.newValue);
      for (let key of new Set(oldKeys.concat(newKeys))) {
        if (!oldKeys.includes(key)) {
          this._metadataChanged.emit({
            key,
            newValue: metadataChange.newValue[key],
            type: 'add'
          });
        } else if (!newKeys.includes(key)) {
          this._metadataChanged.emit({
            key,
            oldValue: metadataChange.oldValue[key],
            type: 'remove'
          });
        } else if (
          !JSONExt.deepEqual(oldValue[key], metadataChange.newValue[key]!)
        ) {
          this._metadataChanged.emit({
            key,
            newValue: metadataChange.newValue[key],
            oldValue: metadataChange.oldValue[key],
            type: 'change'
          });
        }
      }
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

    return changes;
  }

  /**
   * Handle a change to the ymodel.
   */
  private _modelObserver = (events: Y.YEvent<any>[]) => {
    this._changed.emit(this.getChanges(events));
  };

  protected _metadataChanged = new Signal<this, IMapChange>(this);
  /**
   * The notebook that this cell belongs to.
   */
  protected _notebook: YNotebook | null = null;
  private _awareness: Awareness | null;
  private _changed = new Signal<this, CellChange<Metadata>>(this);
  private _disposed = new Signal<this, void>(this);
  private _isDisposed = false;
  private _prevSourceLength: number;
  private _undoManager: Y.UndoManager | null = null;
  private _ysource: Y.Text;
}

/**
 * Shareable code cell.
 */
export class YCodeCell
  extends YBaseCell<nbformat.IBaseCellMetadata>
  implements ISharedCodeCell
{
  /**
   * Create a new YCodeCell that works standalone. It cannot be
   * inserted into a YNotebook because the Yjs model is already
   * attached to an anonymous Y.Doc instance.
   */
  static createStandalone(id?: string): YCodeCell {
    return super.createStandalone(id) as YCodeCell;
  }

  /**
   * Code cell constructor
   *
   * ### Notes
   * Don't use the constructor directly - prefer using ``YNotebook.insertCell``
   *
   * The ``ysource`` is needed because ``ymodel.get('source')`` will
   * not return the real source if the model is not yet attached to
   * a document. Requesting it explicitly allows to introspect a non-empty
   * source before the cell is attached to the document.
   *
   * @param ymodel Cell map
   * @param ysource Cell source
   * @param youtputs Code cell outputs
   * @param options { notebook?: The notebook the cell is attached to }
   */
  constructor(
    ymodel: Y.Map<any>,
    ysource: Y.Text,
    youtputs: Y.Array<any>,
    options: SharedCell.IOptions = {}
  ) {
    super(ymodel, ysource, options);
    this._youtputs = youtputs;
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
    // Do not use `this.execution_count`. When initializing the
    // cell, we need to set execution_count to `null` if we compare
    // using `this.execution_count` it will return `null` and we will
    // never initialize it
    if (this.ymodel.get('execution_count') !== count) {
      this.transact(() => {
        this.ymodel.set('execution_count', count);
      });
    }
  }

  /**
   * Cell outputs.
   */
  get outputs(): Array<nbformat.IOutput> {
    return this.getOutputs();
  }
  set outputs(v: Array<nbformat.IOutput>) {
    this.setOutputs(v);
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
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.ICodeCell {
    return {
      ...(super.toJSON() as nbformat.ICodeCell),
      outputs: this.getOutputs(),
      execution_count: this.execution_count
    };
  }

  /**
   * Extract changes from YJS events
   *
   * @param events YJS events
   * @returns Cell changes
   */
  protected getChanges(
    events: Y.YEvent<any>[]
  ): Partial<CellChange<nbformat.IBaseCellMetadata>> {
    const changes = super.getChanges(events);

    const outputEvent = events.find(
      event => event.target === this.ymodel.get('outputs')
    );
    if (outputEvent) {
      changes.outputsChange = outputEvent.changes.delta as any;
    }

    const modelEvent = events.find(event => event.target === this.ymodel) as
      | undefined
      | Y.YMapEvent<any>;

    if (modelEvent && modelEvent.keysChanged.has('execution_count')) {
      const change = modelEvent.changes.keys.get('execution_count');
      changes.executionCountChange = {
        oldValue: change!.oldValue,
        newValue: this.ymodel.get('execution_count')
      };
    }

    return changes;
  }

  private _youtputs: Y.Array<nbformat.IOutput>;
}

class YAttachmentCell
  extends YBaseCell<nbformat.IBaseCellMetadata>
  implements ISharedAttachmentsCell
{
  /**
   * Cell attachments
   */
  get attachments(): nbformat.IAttachments | undefined {
    return this.getAttachments();
  }
  set attachments(v: nbformat.IAttachments | undefined) {
    this.setAttachments(v);
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
   * Extract changes from YJS events
   *
   * @param events YJS events
   * @returns Cell changes
   */
  protected getChanges(
    events: Y.YEvent<any>[]
  ): Partial<CellChange<nbformat.IBaseCellMetadata>> {
    const changes = super.getChanges(events);

    const modelEvent = events.find(event => event.target === this.ymodel) as
      | undefined
      | Y.YMapEvent<any>;

    if (modelEvent && modelEvent.keysChanged.has('attachments')) {
      const change = modelEvent.changes.keys.get('attachments');
      changes.executionCountChange = {
        oldValue: change!.oldValue,
        newValue: this.ymodel.get('attachments')
      };
    }

    return changes;
  }
}

/**
 * Shareable raw cell.
 */
export class YRawCell extends YAttachmentCell implements ISharedRawCell {
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
  extends YAttachmentCell
  implements ISharedMarkdownCell
{
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

/**
 * Cell type.
 */
export type YCellType = YRawCell | YCodeCell | YMarkdownCell;

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
    const notebook = new YNotebook(options);
    notebook.nbformat = nbformat.MAJOR_VERSION;
    notebook.nbformat_minor = nbformat.MINOR_VERSION;
    if (!notebook.ymeta.get('metadata')) {
      notebook.ymeta.set('metadata', {});
    }
    return notebook;
  }

  constructor(options: ISharedNotebook.IOptions = {}) {
    super();
    this._disableDocumentWideUndoRedo =
      options.disableDocumentWideUndoRedo ?? false;
    this.cells = this._ycells.toArray().map(ycell => {
      if (!this._ycellMapping.has(ycell)) {
        this._ycellMapping.set(
          ycell,
          createCellModelFromSharedType(ycell, { notebook: this })
        );
      }
      return this._ycellMapping.get(ycell) as YCellType;
    });

    this.undoManager.addToScope(this._ycells);
    this._ycells.observe(this._onYCellsChanged);
    this.ymeta.observe(this._onMetaChanged);
  }

  /**
   * YJS map for the notebook metadata
   */
  readonly ymeta: Y.Map<any> = this.ydoc.getMap('meta');
  /**
   * Cells list
   */
  readonly cells: YCellType[];

  /**
   * Wether the undo/redo logic should be
   * considered on the full document across all cells.
   *
   * Default: false
   */
  get disableDocumentWideUndoRedo(): boolean {
    return this._disableDocumentWideUndoRedo;
  }

  /**
   * Notebook metadata
   */
  get metadata(): nbformat.INotebookMetadata {
    return this.getMetadata();
  }
  set metadata(v: nbformat.INotebookMetadata) {
    this.setMetadata(v);
  }

  /**
   * Signal triggered when a metadata changes.
   */
  get metadataChanged(): ISignal<this, IMapChange> {
    return this._metadataChanged;
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
    this._ycells.unobserve(this._onYCellsChanged);
    this.ymeta.unobserve(this._onMetaChanged);
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
   * Add a shared cell at the notebook bottom.
   *
   * @param cell Cell to add.
   *
   * @returns The added cell.
   */
  addCell(cell: SharedCell.Cell): YBaseCell<nbformat.IBaseCellMetadata> {
    return this.insertCell(this._ycells.length, cell);
  }

  /**
   * Insert a shared cell into a specific position.
   *
   * @param index: Cell's position.
   * @param cell: Cell to insert.
   *
   * @returns The inserted cell.
   */
  insertCell(
    index: number,
    cell: SharedCell.Cell
  ): YBaseCell<nbformat.IBaseCellMetadata> {
    return this.insertCells(index, [cell])[0];
  }

  /**
   * Insert a list of shared cells into a specific position.
   *
   * @param index: Position to insert the cells.
   * @param cells: Array of shared cells to insert.
   *
   * @returns The inserted cells.
   */
  insertCells(
    index: number,
    cells: SharedCell.Cell[]
  ): YBaseCell<nbformat.IBaseCellMetadata>[] {
    const yCells = cells.map(c => {
      const cell = createCell(c, this);
      this._ycellMapping.set(cell.ymodel, cell);
      return cell;
    });

    this.transact(() => {
      this._ycells.insert(
        index,
        yCells.map(cell => cell.ymodel)
      );
    });

    yCells.forEach(c => {
      c.setUndoManager();
    });

    return yCells;
  }

  /**
   * Move a cell.
   *
   * @param fromIndex: Index of the cell to move.
   * @param toIndex: New position of the cell.
   */
  moveCell(fromIndex: number, toIndex: number): void {
    this.transact(() => {
      // FIXME we need to use yjs move feature to preserve undo history
      const clone = createCell(this.getCell(fromIndex).toJSON(), this);
      this._ycells.delete(fromIndex, 1);
      this._ycells.insert(toIndex, [clone.ymodel]);
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
   * @param to: The end index of the range to remove (exclusive).
   */
  deleteCellRange(from: number, to: number): void {
    // Cells will be removed from the mapping in the model event listener.
    this.transact(() => {
      this._ycells.delete(from, to - from);
    });
  }

  /**
   * Delete a metadata notebook.
   *
   * @param key The key to delete
   */
  deleteMetadata(key: string): void {
    if (typeof this.getMetadata(key) === 'undefined') {
      return;
    }

    const allMetadata = JSONExt.deepCopy(this.ymeta.get('metadata'));
    delete allMetadata[key];
    this.setMetadata(allMetadata);
  }

  /**
   * Returns some metadata associated with the notebook.
   *
   * If no `key` is provided, it will return all metadata.
   * Else it will return the value for that key.
   *
   * @param key Key to get from the metadata
   * @returns Notebook's metadata.
   */
  getMetadata(key?: string): nbformat.INotebookMetadata {
    const meta = this.ymeta.get('metadata');

    if (typeof key === 'string') {
      const value = meta[key];
      return typeof value === 'undefined'
        ? undefined // undefined is converted to `{}` by `JSONExt.deepCopy`
        : JSONExt.deepCopy(meta[key]);
    } else {
      return JSONExt.deepCopy(meta);
    }
  }

  /**
   * Sets some metadata associated with the notebook.
   *
   * If only one argument is provided, it will override all notebook metadata.
   * Otherwise a single key will be set to a new value.
   *
   * @param metadata All Notebook's metadata or the key to set.
   * @param value New metadata value
   */
  setMetadata(
    metadata: nbformat.INotebookMetadata | string,
    value?: PartialJSONValue
  ): void {
    if (typeof metadata === 'string') {
      if (typeof value === 'undefined') {
        throw new TypeError(
          `Metadata value for ${metadata} cannot be 'undefined'; use deleteMetadata.`
        );
      }

      if (JSONExt.deepEqual(this.getMetadata(metadata) ?? null, value)) {
        return;
      }

      const update: Partial<nbformat.INotebookMetadata> = {};
      update[metadata] = value;
      this.updateMetadata(update);
    } else {
      if (!JSONExt.deepEqual(this.metadata, metadata)) {
        this.ymeta.set('metadata', JSONExt.deepCopy(metadata));
      }
    }
  }

  /**
   * Updates the metadata associated with the notebook.
   *
   * @param value: Metadata's attribute to update.
   */
  updateMetadata(value: Partial<nbformat.INotebookMetadata>): void {
    // TODO: Maybe modify only attributes instead of replacing the whole metadata?
    this.ymeta.set('metadata', { ...this.getMetadata(), ...value });
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.INotebookContent {
    // strip cell ids if we have notebook format 4.0-4.4
    const pruneCellId = this.nbformat === 4 && this.nbformat_minor <= 4;

    return {
      metadata: this.metadata,
      nbformat_minor: this.nbformat_minor,
      nbformat: this.nbformat,
      cells: this.cells.map(c => {
        const raw = c.toJSON();
        if (pruneCellId) {
          delete raw.id;
        }
        return raw;
      })
    };
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

      const oldValue = metadataChange.oldValue ?? {};
      const oldKeys = Object.keys(oldValue);
      const newKeys = Object.keys(metadataChange.newValue);
      for (let key of new Set(oldKeys.concat(newKeys))) {
        if (!oldKeys.includes(key)) {
          this._metadataChanged.emit({
            key,
            newValue: metadataChange.newValue[key],
            type: 'add'
          });
        } else if (!newKeys.includes(key)) {
          this._metadataChanged.emit({
            key,
            oldValue: metadataChange.oldValue[key],
            type: 'remove'
          });
        } else if (
          !JSONExt.deepEqual(oldValue[key], metadataChange.newValue[key]!)
        ) {
          this._metadataChanged.emit({
            key,
            newValue: metadataChange.newValue[key],
            oldValue: metadataChange.oldValue[key],
            type: 'change'
          });
        }
      }

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
   * Handle a change to the list of cells.
   */
  private _onYCellsChanged = (event: Y.YArrayEvent<Y.Map<any>>) => {
    // update the type cell mapping by iterating through the added/removed types
    event.changes.added.forEach(item => {
      const type = (item.content as Y.ContentType).type as Y.Map<any>;
      if (!this._ycellMapping.has(type)) {
        const c = createCellModelFromSharedType(type, { notebook: this });
        c!.setUndoManager();
        this._ycellMapping.set(type, c);
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

  protected _metadataChanged = new Signal<this, IMapChange>(this);
  /**
   * Internal Yjs cells list
   */
  protected readonly _ycells: Y.Array<Y.Map<any>> = this.ydoc.getArray('cells');

  private _disableDocumentWideUndoRedo: boolean;
  private _ycellMapping: WeakMap<Y.Map<any>, YCellType> = new WeakMap();
}
