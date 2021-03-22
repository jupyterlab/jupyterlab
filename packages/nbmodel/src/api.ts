/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { PartialJSONObject } from '@lumino/coreutils';

import { IDisposable } from '@lumino/disposable';

import { ISignal } from '@lumino/signaling';

import * as nbformat from '@jupyterlab/nbformat';

import { Delta } from './utils';

/**
 * This file defines the shared nbmodel types.
 *
 * - Notebook Type.
 * - Notebook Metadata Types.
 * - Cell Types.
 * - Cell Metadata Types.
 *
 * It also defines the shared changes to be used in the events.
 */

// Notebook Type.

/**
 * Implements an API for nbformat.INotebookContent
 */
export interface ISharedNotebook extends IDisposable {
  getMetadata(): nbformat.INotebookMetadata;
  setMetadata(metadata: nbformat.INotebookMetadata): void;
  readonly nbformat_minor: number;
  readonly nbformat: number;
  readonly cells: ISharedCell[];
  getCell(index: number): ISharedCell;
  insertCell(index: number, cell: ISharedCell): void;
  insertCells(index: number, cells: Array<ISharedCell>): void;
  moveCell(fromIndex: number, toIndex: number): void;
  deleteCell(index: number): void;
  undo(): void;
  redo(): void;
  readonly changed: ISignal<this, NotebookChange>;
}

// Notebook Metadata Types.

export interface ISharedKernelspecMetadata
  extends nbformat.IKernelspecMetadata,
    IDisposable {
  [key: string]: any;
  name: string;
  display_name: string;
}

export interface ISharedLanguageInfoMetadata
  extends nbformat.ILanguageInfoMetadata,
    IDisposable {
  [key: string]: any;
  name: string;
  codemirror_mode?: string | PartialJSONObject;
  file_extension?: string;
  mimetype?: string;
  pygments_lexer?: string;
}

// Cell Types.

export type ISharedCell =
  | ISharedCodeCell
  | ISharedRawCell
  | ISharedMarkdownCell
  | ISharedUnrecognizedCell;

/**
 * Implements an API for nbformat.IBaseCell.
 */
export interface ISharedBaseCell<Metadata extends nbformat.IBaseCellMetadata>
  extends IDisposable {
  getSource(): string;
  setSource(value: string): void;
  /**
   * Replace content from `start' to `end` with `value`.
   */
  updateSource(start: number, end: number, value?: string): void;
  getMetadata(): Partial<Metadata>;
  getMetadata(metadata: Partial<Metadata>): void;
  toJSON(): nbformat.IBaseCell;
  readonly cell_type: 'code' | 'markdown' | 'raw';
  readonly changed: ISignal<this, CellChange<Metadata>>;
}

/**
 * Implements an API for nbformat.ICodeCell.
 */
export interface ISharedCodeCell
  extends ISharedBaseCell<nbformat.ICodeCellMetadata>,
    IDisposable {
  cell_type: 'code';
  /**
   * The code cell's prompt number. Will be null if the cell has not been run.
   */
  execution_count: nbformat.ExecutionCount;
  /**
   * Execution, display, or stream outputs.
   */
  getOutputs(): nbformat.IOutput[];
  toJSON(): nbformat.ICodeCell;
}

/**
 * Implements an API for nbformat.IMarkdownCell.
 */
export interface ISharedMarkdownCell
  extends ISharedBaseCell<nbformat.IRawCellMetadata>,
    IDisposable {
  /**
   * String identifying the type of cell.
   */
  cell_type: 'markdown';
  /**
   * Cell attachments.
   */
  getAttachments(): nbformat.IAttachments | undefined;
  setAttachments(attchments: nbformat.IAttachments | undefined): void;
  toJSON(): nbformat.IMarkdownCell;
}

/**
 * Implements an API for nbformat.IRawCell.
 */
export interface ISharedRawCell
  extends ISharedBaseCell<nbformat.IRawCellMetadata>,
    IDisposable {
  /**
   * String identifying the type of cell.
   */
  cell_type: 'raw';
  getAttachments(): nbformat.IAttachments | undefined;
  setAttachments(attchments: nbformat.IAttachments | undefined): void;
  toJSON(): nbformat.IRawCell;
}

/**
 * Implements an API for nbformat.IUnrecognizedCell.
 *
 * @todo Is this needed?
 */
export interface ISharedUnrecognizedCell
  extends ISharedBaseCell<nbformat.IRawCellMetadata>,
    IDisposable {
  cell_type: 'raw';
  toJSON(): nbformat.ICodeCell;
}

/**
 * Definition of the shared changes.
 */
export type NotebookChange = {
  cellsChange?: Delta<ISharedCell[]>;
  metadataChange?: {
    oldValue: nbformat.INotebookMetadata;
    newValue: nbformat.INotebookMetadata | undefined;
  };
};

export type CellChange<MetadataType> = {
  sourceChange?: Delta<string>;
  metadataChange?: {
    oldValue: Partial<MetadataType> | undefined;
    newValue: Partial<MetadataType> | undefined;
  };
};

export type MapChange = Map<
  string,
  { action: 'add' | 'update' | 'delete'; oldValue: any; newValue: any }
>;
