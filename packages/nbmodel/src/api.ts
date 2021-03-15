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
  metadata: nbformat.INotebookMetadata;
  readonly nbformat_minor: number;
  readonly nbformat: number;
  cells: ISharedCell[];
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

export interface ISharedBaseCell<Metadata extends nbformat.IBaseCellMetadata>
  extends nbformat.IBaseCell,
    IDisposable {
  [key: string]: any;
  source: string;
  metadata: Partial<Metadata>;
  // cell_type: 'code' | 'markdown' | 'raw'
  readonly changed: ISignal<this, CellChange<Metadata>>;
}

export interface ISharedCodeCell
  extends ISharedBaseCell<nbformat.ICodeCellMetadata>,
    nbformat.ICodeCell,
    IDisposable {
  [key: string]: any;
  source: string;
  cell_type: 'code';
  metadata: Partial<nbformat.ICodeCellMetadata>;
}

export interface ISharedMarkdownCell
  extends ISharedBaseCell<nbformat.IRawCellMetadata>,
    nbformat.IMarkdownCell,
    IDisposable {
  [key: string]: any;
  source: string;
  cell_type: 'markdown';
  metadata: Partial<nbformat.IRawCellMetadata>;
}

export interface ISharedRawCell
  extends ISharedBaseCell<nbformat.IRawCellMetadata>,
    nbformat.IRawCell,
    IDisposable {
  [key: string]: any;
  source: string;
  cell_type: 'raw';
  metadata: Partial<nbformat.IRawCellMetadata>;
}

export interface ISharedUnrecognizedCell
  extends ISharedBaseCell<nbformat.IRawCellMetadata>,
    nbformat.IUnrecognizedCell,
    IDisposable {
  [key: string]: any;
  source: string;
  metadata: Partial<nbformat.IRawCellMetadata>;
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
