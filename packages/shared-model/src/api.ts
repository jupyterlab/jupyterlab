/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as nbformat from '@jupyterlab/nbformat';

/**
 * Definition of the shared model types.
 *
 * - Notebook Type.
 * - Notebook Metadata Types.
 * - Cell Types.
 * - Cell Metadata Types.
 */

// Notebook Type.

export type ISharedNotebook = nbformat.INotebookContent & {
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
};

// Notebook Metadata Types.

export type ISharedNotebookMetadata = nbformat.INotebookMetadata & {
  kernelspec?: ISharedKernelspecMetadata;
  language_info?: ISharedLanguageInfoMetadata;
  orig_nbformat: number;
};

export type ISharedKernelspecMetadata = nbformat.IKernelspecMetadata;

export type ISharedLanguageInfoMetadata = nbformat.ILanguageInfoMetadata;

// Cell Types.

export type ISharedCell =
  | ISharedCodeCell
  | ISharedRawCell
  | ISharedMardownCell
  | ISharedUnrecognizedCell;

export interface ISharedCodeCell extends nbformat.ICodeCell {
  metadata: Partial<ISharedCodeCellMetadata>;
}
export type ISharedMardownCell = nbformat.IMarkdownCell;
export type ISharedRawCell = nbformat.IRawCell;
export type ISharedUnrecognizedCell = nbformat.IUnrecognizedCell;

// Cell Metadata Types.

export type ISharedCodeCellMetadata = nbformat.ICodeCellMetadata & {
  collapsed: boolean;
  jupyter: Partial<ISharedCodeCellJupyterMetadata>;
  scrolled: boolean | 'auto';
};

export type ISharedCodeCellJupyterMetadata = nbformat.ICodeCellJupyterMetadata;

export type ISharedCellJupyterMetadata = nbformat.IBaseCellJupyterMetadata;
