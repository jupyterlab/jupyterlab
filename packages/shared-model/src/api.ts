/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as nbformat from '@jupyterlab/nbformat';

export interface ISharedCellJupyterMetadata
  extends nbformat.IBaseCellJupyterMetadata {}

export type ISharedCodeCellMetadata = nbformat.ICodeCellMetadata;

export interface ISharedCodeCell extends nbformat.ICodeCell {
  metadata: Partial<ISharedCodeCellMetadata>;
}
export interface ISharedRawCell extends nbformat.IRawCell {}
export interface ISharedMardownCell extends nbformat.IMarkdownCell {}
export interface ISharedUnrecognizedCell extends nbformat.IUnrecognizedCell {}
export declare type ISharedCell =
  | ISharedCodeCell
  | ISharedRawCell
  | ISharedMardownCell
  | ISharedUnrecognizedCell;

export type ISharedNotebook = nbformat.INotebookContent & {
  getCell(index: number): ISharedCell;
  insertCell(cell: ISharedCell): void;
  insertCells(cells: Array<ISharedCell>): void;
  moveCell(fromIndex: number, toIndex: number): void;
  deleteCell(index: number): void;
  undo(): void;
  redo(): void;
};
