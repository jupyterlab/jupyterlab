/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as nbformat from '@jupyterlab/nbformat';

import { IDisposable } from '@lumino/disposable';

import { ISignal } from '@lumino/signaling';

import Delta from 'quill-delta';

/**
 * Definition of the shared model types.
 *
 * - Notebook Type.
 * - Notebook Metadata Types.
 * - Cell Types.
 * - Cell Metadata Types.
 */

// Notebook Type.
export interface ISharedNotebook
  extends nbformat.INotebookContent,
    IDisposable {
  [key: string]: any;
  metadata: ISharedNotebookMetadata;
  nbformat_minor: number;
  nbformat: number;
  cells: ISharedCell[];
  getCell(index: number): ISharedCell;
  insertCell(cell: ISharedCell): void;
  insertCells(cells: Array<ISharedCell>): void;
  moveCell(fromIndex: number, toIndex: number): void;
  deleteCell(index: number): void;
  undo(): void;
  redo(): void;
  readonly changed: ISignal<this, Delta>;
}

// Notebook Metadata Types.
export interface ISharedNotebookMetadata
  extends nbformat.INotebookMetadata,
    IDisposable {
  [key: string]: any;
  kernelspec?: ISharedKernelspecMetadata;
  language_info?: ISharedLanguageInfoMetadata;
  orig_nbformat: number;
  readonly changed: ISignal<this, Delta>;
}
export interface ISharedKernelspecMetadata
  extends nbformat.IKernelspecMetadata,
    IDisposable {
  [key: string]: any;
}
export interface ISharedLanguageInfoMetadata
  extends nbformat.ILanguageInfoMetadata,
    IDisposable {
  [key: string]: any;
}

// Cell Types.
export type ISharedCell =
  | ISharedCodeCell
  | ISharedRawCell
  | ISharedMardownCell
  | ISharedUnrecognizedCell;
export interface ISharedBaseCell extends nbformat.IBaseCell, IDisposable {
  [key: string]: any;
  readonly changed: ISignal<this, Delta>;
}
export interface ISharedCodeCell
  extends ISharedBaseCell,
    nbformat.ICodeCell,
    IDisposable {
  [key: string]: any;
  cell_type: 'code';
  metadata: Partial<ISharedCodeCellMetadata>;
}
export interface ISharedMardownCell
  extends ISharedBaseCell,
    nbformat.IMarkdownCell,
    IDisposable {
  [key: string]: any;
  cell_type: 'markdown';
}
export interface ISharedRawCell
  extends ISharedBaseCell,
    nbformat.IRawCell,
    IDisposable {
  [key: string]: any;
  cell_type: 'raw';
  metadata: Partial<ISharedRawCellMetadata>;
}
export interface ISharedUnrecognizedCell
  extends ISharedBaseCell,
    nbformat.IUnrecognizedCell,
    IDisposable {
  [key: string]: any;
  readonly changed: ISignal<this, Delta>;
}

// Cell Metadata Types.
export interface ISharedCodeCellMetadata
  extends nbformat.ICodeCellMetadata,
    IDisposable {
  [key: string]: any;
  collapsed: boolean;
  jupyter: Partial<ISharedCodeCellJupyterMetadata>;
  scrolled: boolean | 'auto';
  readonly changed: ISignal<this, Delta>;
}
export interface ISharedCodeCellJupyterMetadata
  extends nbformat.ICodeCellJupyterMetadata,
    IDisposable {
  [key: string]: any;
}
export interface ISharedCellJupyterMetadata
  extends nbformat.IBaseCellJupyterMetadata,
    IDisposable {
  [key: string]: any;
}
export interface ISharedRawCellMetadata
  extends nbformat.IRawCellMetadata,
    IDisposable {
  [key: string]: any;
}
