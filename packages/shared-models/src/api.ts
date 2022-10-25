/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

/**
 * This file defines the shared shared-models types.
 *
 * - Notebook Type.
 * - Notebook Metadata Types.
 * - Cell Types.
 * - Cell Metadata Types.
 *
 * It also defines the shared changes to be used in the events.
 */

import type * as nbformat from '@jupyterlab/nbformat';
import type {
  JSONObject,
  JSONValue,
  PartialJSONValue
} from '@lumino/coreutils';
import type {
  IDisposable,
  IObservableDisposable
} from '@lumino/disposable';
import type { ISignal } from '@lumino/signaling';

/**
 * Changes on Sequence-like data are expressed as Quill-inspired deltas.
 *
 * @source https://quilljs.com/docs/delta/
 */
export type Delta<T> = Array<{ insert?: T; delete?: number; retain?: number }>;

/**
 * ISharedBase defines common operations that can be performed on any shared object.
 */
export interface ISharedBase extends IDisposable {
  /**
   * Undo an operation.
   */
  undo(): void;

  /**
   * Redo an operation.
   */
  redo(): void;

  /**
   * Whether the object can redo changes.
   */
  canUndo(): boolean;

  /**
   * Whether the object can undo changes.
   */
  canRedo(): boolean;

  /**
   * Clear the change stack.
   */
  clearUndoHistory(): void;

  /**
   * Perform a transaction. While the function f is called, all changes to the shared
   * document are bundled into a single event.
   */
  transact(f: () => void): void;
}

/**
 * Implement an API for Context information on the shared information.
 * This is used by, for example, docregistry to share the file-path of the edited content.
 */
export interface ISharedDocument extends ISharedBase {
  /**
   * Document state
   */
  readonly state: JSONObject;

  /**
   * Get the value for a state attribute
   *
   * @param key Key to get
   */
  getState(key: string): JSONValue | undefined;

  /**
   * Set the value of a state attribute
   *
   * @param key Key to set
   * @param value New attribute value
   */
  setState(key: string, value: JSONValue): void;

  /**
   * The changed signal.
   */
  readonly changed: ISignal<this, DocumentChange>;
}

/**
 * The ISharedText interface defines models that can be bound to a text editor like CodeMirror.
 */
export interface ISharedText extends ISharedBase {
  /**
   * The changed signal.
   */
  readonly changed: ISignal<this, SourceChange>;

  /**
   * Text
   */
  source: string;

  /**
   * Get text.
   *
   * @returns Text.
   */
  getSource(): string;

  /**
   * Set text.
   *
   * @param value New text.
   */
  setSource(value: string): void;

  /**
   * Replace content from `start' to `end` with `value`.
   *
   * @param start: The start index of the range to replace (inclusive).
   * @param end: The end index of the range to replace (exclusive).
   * @param value: New source (optional).
   */
  updateSource(start: number, end: number, value?: string): void;
}

/**
 * Text/Markdown/Code files are represented as ISharedFile
 */
export interface ISharedFile extends ISharedDocument, ISharedText {
  /**
   * The changed signal.
   */
  readonly changed: ISignal<this, FileChange>;
}

/**
 * Implements an API for nbformat.INotebookContent
 */
export interface ISharedNotebook extends ISharedDocument {
  /**
   * The changed signal.
   */
  readonly changed: ISignal<this, NotebookChange>;

  /**
   * Signal triggered when a metadata changes.
   */
  readonly metadataChanged: ISignal<this, IMapChange>;

  /**
   * The list of shared cells in the notebook.
   */
  readonly cells: ISharedCell[];

  /**
   * Wether the undo/redo logic should be
   * considered on the full document across all cells.
   */
  readonly disableDocumentWideUndoRedo?: boolean;

  /**
   * Notebook metadata.
   */
  metadata: nbformat.INotebookMetadata;

  /**
   * The minor version number of the nbformat.
   */
  readonly nbformat_minor: number;

  /**
   * The major version number of the nbformat.
   */
  readonly nbformat: number;

  /**
   * Delete a metadata notebook.
   *
   * @param key The key to delete
   */
  deleteMetadata(key: string): void;

  /**
   * Returns some metadata associated with the notebook.
   *
   * If no `key` is provided, it will return all metadata.
   * Else it will return the value for that key.
   *
   * @param key Key to get from the metadata
   * @returns Notebook's metadata.
   */
  getMetadata(key?: string): nbformat.INotebookMetadata;

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
  ): void;

  /**
   * Updates the metadata associated with the notebook.
   *
   * @param value: Metadata's attribute to update.
   */
  updateMetadata(value: Partial<nbformat.INotebookMetadata>): void;

  /**
   * Add a shared cell at the notebook bottom.
   *
   * @param cell Cell to add.
   *
   * @returns The added cell.
   */
  addCell(cell: SharedCell.Cell): ISharedCell;

  /**
   * Get a shared cell by index.
   *
   * @param index: Cell's position.
   *
   * @returns The requested shared cell.
   */
  getCell(index: number): ISharedCell;

  /**
   * Insert a shared cell into a specific position.
   *
   * @param index Cell's position.
   * @param cell Cell to insert.
   *
   * @returns The inserted cell.
   */
  insertCell(index: number, cell: SharedCell.Cell): ISharedCell;

  /**
   * Insert a list of shared cells into a specific position.
   *
   * @param index Position to insert the cells.
   * @param cells Array of shared cells to insert.
   *
   * @returns The inserted cells.
   */
  insertCells(index: number, cells: Array<SharedCell.Cell>): ISharedCell[];

  /**
   * Move a cell.
   *
   * @param fromIndex: Index of the cell to move.
   *
   * @param toIndex: New position of the cell.
   *
   * @param n: Number of cells to move (default 1)
   */
  moveCell(fromIndex: number, toIndex: number, n?: number): void;

  /**
   * Remove a cell.
   *
   * @param index: Index of the cell to remove.
   */
  deleteCell(index: number): void;

  /**
   * Remove a range of cells.
   *
   * @param from: The start index of the range to remove (inclusive).
   *
   * @param to: The end index of the range to remove (exclusive).
   */
  deleteCellRange(from: number, to: number): void;

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.INotebookContent;
}

/**
 * Definition of the map changes for yjs.
 */
export type MapChange = Map<
  string,
  { action: 'add' | 'update' | 'delete'; oldValue: any; newValue: any }
>;

/**
 * The namespace for `ISharedNotebook` class statics.
 */
export namespace ISharedNotebook {
  /**
   * The options used to initialize a a ISharedNotebook
   */
  export interface IOptions {
    /**
     * Wether the the undo/redo logic should be
     * considered on the full document across all cells.
     */
    disableDocumentWideUndoRedo?: boolean;
  }
}

/** Cell Types. */
export type ISharedCell =
  | ISharedCodeCell
  | ISharedRawCell
  | ISharedMarkdownCell
  | ISharedUnrecognizedCell;

/**
 * Shared cell namespace
 */
export namespace SharedCell {
  /**
   * Cell data
   */
  export type Cell = (
    | Partial<nbformat.IRawCell>
    | Partial<nbformat.ICodeCell>
    | Partial<nbformat.IMarkdownCell>
    | Partial<nbformat.IBaseCell>
  ) & { cell_type: string };

  /**
   * Shared cell constructor options.
   */
  export interface IOptions {
    /**
     * Optional notebook to which this cell belongs.
     *
     * If not provided the cell will be standalone.
     */
    notebook?: ISharedNotebook;
  }
}

/**
 * Implements an API for nbformat.IBaseCell.
 */
export interface ISharedBaseCell<
  Metadata extends nbformat.IBaseCellMetadata = nbformat.IBaseCellMetadata
> extends ISharedText,
    IObservableDisposable {
  /**
   * The type of the cell.
   */
  readonly cell_type: nbformat.CellType;

  /**
   * The changed signal.
   */
  readonly changed: ISignal<this, CellChange<Metadata>>;

  /**
   * Cell id.
   */
  readonly id: string;

  /**
   * Whether the cell is standalone or not.
   *
   * If the cell is standalone. It cannot be
   * inserted into a YNotebook because the Yjs model is already
   * attached to an anonymous Y.Doc instance.
   */
  readonly isStandalone: boolean;

  /**
   * Cell metadata.
   */
  metadata: Partial<Metadata>;

  /**
   * Signal triggered when the cell metadata changes.
   */
  readonly metadataChanged: ISignal<this, IMapChange>;

  /**
   * The notebook that this cell belongs to.
   */
  readonly notebook: ISharedNotebook | null;

  /**
   * Get Cell id.
   *
   * @returns Cell id.
   */
  getId(): string;

  /**
   * Delete a metadata cell.
   *
   * @param key The key to delete
   */
  deleteMetadata(key: string): void;

  /**
   * Returns some metadata associated with the cell.
   *
   * If a `key` is provided, returns the metadata value.
   * Otherwise returns all metadata
   *
   * @returns Cell's metadata.
   */
  getMetadata(key?: string): Partial<Metadata>;

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
  ): void;

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IBaseCell;
}

/**
 * Implements an API for nbformat.ICodeCell.
 */
export interface ISharedCodeCell
  extends ISharedBaseCell<nbformat.IBaseCellMetadata> {
  /**
   * The type of the cell.
   */
  cell_type: 'code';

  /**
   * The code cell's prompt number. Will be null if the cell has not been run.
   */
  execution_count: nbformat.ExecutionCount;

  /**
   * Cell outputs
   */
  outputs: Array<nbformat.IOutput>;

  /**
   * Execution, display, or stream outputs.
   */
  getOutputs(): Array<nbformat.IOutput>;

  /**
   * Add/Update output.
   */
  setOutputs(outputs: Array<nbformat.IOutput>): void;

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
    outputs: Array<nbformat.IOutput>
  ): void;

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IBaseCell;
}

/**
 * Cell with attachment interface.
 */
export interface ISharedAttachmentsCell
  extends ISharedBaseCell<nbformat.IBaseCellMetadata> {
  /**
   * Cell attachments
   */
  attachments?: nbformat.IAttachments;

  /**
   * Gets the cell attachments.
   *
   * @returns The cell attachments.
   */
  getAttachments(): nbformat.IAttachments | undefined;

  /**
   * Sets the cell attachments
   *
   * @param attachments: The cell attachments.
   */
  setAttachments(attachments: nbformat.IAttachments | undefined): void;
}

/**
 * Implements an API for nbformat.IMarkdownCell.
 */
export interface ISharedMarkdownCell extends ISharedAttachmentsCell {
  /**
   * String identifying the type of cell.
   */
  cell_type: 'markdown';

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IMarkdownCell;
}

/**
 * Implements an API for nbformat.IRawCell.
 */
export interface ISharedRawCell extends ISharedAttachmentsCell {
  /**
   * String identifying the type of cell.
   */
  cell_type: 'raw';

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IRawCell;
}

/**
 * Implements an API for nbformat.IUnrecognizedCell.
 */
export interface ISharedUnrecognizedCell
  extends ISharedBaseCell<nbformat.IBaseCellMetadata> {
  /**
   * The type of the cell.
   *
   * The notebook format specified the type will not be 'markdown' | 'raw' | 'code'
   */
  cell_type: string;

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IUnrecognizedCell;
}

export type StateChange<T> = {
  /**
   * Key changed
   */
  name: string;
  /**
   * Old value
   */
  oldValue?: T;
  /**
   * New value
   */
  newValue?: T;
};

/**
 * Generic document change
 */
export type DocumentChange = {
  /**
   * Change occurring in the document state.
   */
  stateChange?: StateChange<any>[];
};

/**
 * The change types which occur on an observable map.
 */
export type MapChangeType =
  /**
   * An entry was added.
   */
  | 'add'

  /**
   * An entry was removed.
   */
  | 'remove'

  /**
   * An entry was changed.
   */
  | 'change';

/**
 * The changed args object which is emitted by an observable map.
 */
export interface IMapChange<T = any> {
  /**
   * The type of change undergone by the map.
   */
  type: MapChangeType;

  /**
   * The key of the change.
   */
  key: string;

  /**
   * The old value of the change.
   */
  oldValue?: T;

  /**
   * The new value of the change.
   */
  newValue?: T;
}

/**
 * Text source change
 */
export type SourceChange = {
  /**
   * Text source change
   */
  sourceChange?: Delta<string>;
};

/**
 * Definition of the shared Notebook changes.
 */
export type NotebookChange = DocumentChange & {
  /**
   * Cell changes
   */
  cellsChange?: Delta<ISharedCell[]>;
  /**
   * Notebook metadata changes
   */
  metadataChange?: {
    oldValue: nbformat.INotebookMetadata;
    newValue?: nbformat.INotebookMetadata;
  };
  /**
   * nbformat version change
   */
  nbformatChanged?: {
    key: string;
    oldValue?: number;
    newValue?: number;
  };
};

/**
 * File change
 */
export type FileChange = DocumentChange & SourceChange;

/**
 * Definition of the shared Cell changes.
 */
export type CellChange<
  MetadataType extends nbformat.IBaseCellMetadata = nbformat.IBaseCellMetadata
> = SourceChange & {
  /**
   * Cell attachment change
   */
  attachmentsChange?: {
    oldValue?: nbformat.IAttachments;
    newValue?: nbformat.IAttachments;
  };
  /**
   * Cell output changes
   */
  outputsChange?: Delta<nbformat.IOutput[]>;
  /**
   * Cell execution count change
   */
  executionCountChange?: {
    oldValue?: number;
    newValue?: number;
  };
  /**
   * Cell metadata change
   */
  metadataChange?: {
    oldValue?: Partial<MetadataType>;
    newValue?: Partial<MetadataType>;
  };
};
