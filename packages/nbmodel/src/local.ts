/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { PartialJSONObject } from '@lumino/coreutils';

import { ISignal, Signal } from '@lumino/signaling';

import Delta from 'quill-delta';

import * as nbformat from '@jupyterlab/nbformat';

import * as nbmodel from './api';

/**
 * Local implementation of the nbmodel types.
 */

// Local Notebook.

export class LocalNotebook implements nbmodel.ISharedNotebook {
  getCell(index: number): nbmodel.ISharedCell {
    return this.cells[index];
  }
  insertCell(cell: nbmodel.ISharedCell): void {
    throw new Error('Method not implemented.');
  }
  insertCells(cells: nbmodel.ISharedCell[]): void {
    throw new Error('Method not implemented.');
  }
  moveCell(fromIndex: number, toIndex: number): void {
    throw new Error('Method not implemented.');
  }
  deleteCell(index: number): void {
    throw new Error('Method not implemented.');
  }
  undo(): void {
    throw new Error('Method not implemented.');
  }
  redo(): void {
    throw new Error('Method not implemented.');
  }

  get changed(): ISignal<this, nbmodel.NotebookChange> {
    return this._changed;
  }

  dispose(): void {
    /* no-op */
  }

  public metadata: nbmodel.ISharedNotebookMetadata;
  public nbformat_minor: number = nbformat.MINOR_VERSION;
  public nbformat: number = nbformat.MAJOR_VERSION;
  public cells: nbmodel.ISharedCell[];
  public isDisposed = false;
  private _changed = new Signal<this, nbmodel.NotebookChange>(this);
}

// Local Notebook Metadata.

export class LocalNotebookMetadata implements nbmodel.ISharedNotebookMetadata {
  get changed(): ISignal<this, nbmodel.MapChange> {
    return this._changed;
  }

  dispose(): void {
    /* no-op */
  }

  public kernelspec?: LocalKernelspecMetadata | undefined;
  public language_info?: LocalLanguageInfoMetadata | undefined;
  public orig_nbformat: number;
  public isDisposed = false;
  private _changed = new Signal<this, nbmodel.MapChange>(this);
}

export class LocalKernelspecMetadata
  implements nbmodel.ISharedKernelspecMetadata {
  dispose(): void {
    /* no-op */
  }

  public name: string;
  public display_name: string;
  public isDisposed = false;
}

export class LocalLanguageInfoMetadata
  implements nbmodel.ISharedLanguageInfoMetadata {
  dispose(): void {
    /* no-op */
  }

  public name: string;
  public codemirror_mode?: string | PartialJSONObject | undefined;
  public file_extension?: string | undefined;
  public mimetype?: string | undefined;
  public pygments_lexer?: string | undefined;
  public isDisposed = false;
}

// Local Cell.

export class LocalRawCell implements nbmodel.ISharedRawCell {
  get changed(): ISignal<this, nbmodel.CellChange> {
    return this._changed;
  }

  dispose(): void {
    /* no-op */
  }

  public cell_type: 'raw';
  public metadata: Partial<nbformat.IRawCellMetadata>;
  public attachments?: nbformat.IAttachments | undefined;
  public source: string;
  public isDisposed = false;
  private _changed = new Signal<this, nbmodel.CellChange>(this);
}

// Local Cell Metadata.

export class LocalCodeCellMetadata implements nbmodel.ISharedCodeCellMetadata {
  constructor() {
    this.collapsed = false;
    this.jupyter = new LocalCodeCellJupyterMetadata();
    this.scrolled = false;
    this.trusted = false;
    this.name = '';
    this.tags = [];
  }

  get changed(): ISignal<this, Delta> {
    return this._changed;
  }

  dispose(): void {
    /* no-op */
  }

  public collapsed: boolean;
  public jupyter: Partial<nbmodel.ISharedCodeCellJupyterMetadata>;
  public scrolled: boolean | 'auto';
  public trusted: boolean;
  public name: string;
  public tags: string[];
  public isDisposed = false;
  private _changed = new Signal<this, Delta>(this);
}

export class LocalCodeCellJupyterMetadata
  implements nbmodel.ISharedCodeCellJupyterMetadata {
  dispose(): void {
    /* no-op */
  }

  public outputs_hidden: boolean = false;
  public source_hidden: boolean = false;
  public isDisposed = false;
}
