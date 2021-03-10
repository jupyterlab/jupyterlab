/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { PartialJSONObject } from '@lumino/coreutils';

import { IDisposable } from '@lumino/disposable';

import { ISignal } from '@lumino/signaling';

import * as nbformat from '@jupyterlab/nbformat';

import Delta from 'quill-delta';

/**
 * This class defines of the shared nbmodel types.
 *
 * - Notebook Type.
 * - Notebook Metadata Types.
 * - Cell Types.
 * - Cell Metadata Types.
 *
 * It also defines the shared changes used to be used in the events.
 */

// Notebook Type.

export interface ISharedNotebook
  extends nbformat.INotebookContent,
    IDisposable {
  [key: string]: any;
  metadata: ISharedNotebookMetadata;
  readonly nbformat_minor: number;
  readonly nbformat: number;
  cells: ISharedCell[];
  getCell(index: number): ISharedCell;
  insertCell(cell: ISharedCell): void;
  insertCells(cells: Array<ISharedCell>): void;
  moveCell(fromIndex: number, toIndex: number): void;
  deleteCell(index: number): void;
  undo(): void;
  redo(): void;
  readonly changed: ISignal<this, NotebookChange>;
}

// Notebook Metadata Types.

export interface ISharedNotebookMetadata
  extends nbformat.INotebookMetadata,
    IDisposable {
  [key: string]: any;
  kernelspec?: ISharedKernelspecMetadata;
  language_info?: ISharedLanguageInfoMetadata;
  orig_nbformat: number;
  readonly changed: ISignal<this, MapChange>;
}

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
  | ISharedMardownCell
  | ISharedUnrecognizedCell;

export interface ISharedBaseCell extends nbformat.IBaseCell, IDisposable {
  [key: string]: any;
  source: string;
  metadata: Partial<ISharedCellMetadata>;
  readonly changed: ISignal<this, CellChange>;
}

export interface ISharedCodeCell
  extends ISharedBaseCell,
    nbformat.ICodeCell,
    IDisposable {
  [key: string]: any;
  source: string;
  cell_type: 'code';
  metadata: Partial<ISharedCodeCellMetadata>;
}

export interface ISharedMardownCell
  extends ISharedBaseCell,
    nbformat.IMarkdownCell,
    IDisposable {
  [key: string]: any;
  source: string;
  cell_type: 'markdown';
  metadata: Partial<ISharedCodeCellMetadata>;
}

export interface ISharedRawCell
  extends ISharedBaseCell,
    nbformat.IRawCell,
    IDisposable {
  [key: string]: any;
  source: string;
  cell_type: 'raw';
  metadata: Partial<ISharedRawCellMetadata>;
}

export interface ISharedUnrecognizedCell
  extends ISharedBaseCell,
    nbformat.IUnrecognizedCell,
    IDisposable {
  [key: string]: any;
  source: string;
  metadata: Partial<ISharedCodeCellMetadata>;
}

// Cell Metadata Types.

export type ISharedCellMetadata =
  | ISharedBaseCellMetadata
  | ISharedRawCellMetadata
  | ISharedCodeCellMetadata;

export interface ISharedCodeCellMetadata
  extends nbformat.ICodeCellMetadata,
    IDisposable {
  [key: string]: any;
  collapsed: boolean;
  jupyter: Partial<ISharedCodeCellJupyterMetadata>;
  scrolled: boolean | 'auto';
  readonly changed: ISignal<this, Delta>;
}

export interface ISharedRawCellMetadata
  extends nbformat.IRawCellMetadata,
    IDisposable {
  [key: string]: any;
  format: string;
}

export interface ISharedBaseCellMetadata
  extends nbformat.IBaseCellMetadata,
    IDisposable {
  [key: string]: any;
  trusted: boolean;
  name: string;
  jupyter: Partial<ISharedCodeCellJupyterMetadata>;
  tags: string[];
}

export interface ISharedCodeCellJupyterMetadata
  extends nbformat.ICodeCellJupyterMetadata,
    IDisposable {
  [key: string]: any;
  outputs_hidden: boolean;
  source_hidden: boolean;
}

/**
 * Definition of the shared changes.
 */

export type NotebookChange = {
  cellChange?: CellChange;
  metadataChange?: MapChange;
};

export type CellChange = {
  sourceChange?: Delta;
  metadataChange?: MapChange;
};

export type MapChange = Map<
  string,
  { action: 'add' | 'update' | 'delete'; oldValue: any; newValue: any }
>;
