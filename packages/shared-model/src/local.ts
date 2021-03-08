/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  IRawCellMetadata,
  IAttachments,
  MultilineString
} from '@jupyterlab/nbformat';

import {
  PartialJSONValue,
  PartialJSONObject,
  PartialJSONArray
} from '@lumino/coreutils';

import * as shared from './api';

/**
 * Local implementation of the shared model types.
 */

// Local Notebook.

export class LocalNotebook implements shared.ISharedNotebook {
  [key: string]: any;

  public metadata: shared.ISharedNotebookMetadata;
  public nbformat_minor: number;
  public nbformat: number;
  public cells: shared.ISharedCell[];

  getCell(index: number): shared.ISharedCell {
    return this.cells[index];
  }
  insertCell(cell: shared.ISharedCell): void {
    throw new Error('Method not implemented.');
  }
  insertCells(cells: shared.ISharedCell[]): void {
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
}

// Local Notebook Metadata.

export class LocalNotebookMetadata implements shared.ISharedNotebookMetadata {
  [key: string]:
    | string
    | number
    | boolean
    | PartialJSONObject
    | PartialJSONArray
    | null
    | undefined;

  public kernelspec?: LocalKernelspecMetadata | undefined;
  public language_info?: LocalLanguageInfoMetadata | undefined;
  public orig_nbformat: number;
}

export class LocalKernelspecMetadata
  implements shared.ISharedKernelspecMetadata {
  [key: string]:
    | string
    | number
    | boolean
    | PartialJSONObject
    | PartialJSONArray
    | null
    | undefined;

  public name: string;
  public display_name: string;
}

export class LocalLanguageInfoMetadata
  implements shared.ISharedLanguageInfoMetadata {
  [key: string]:
    | string
    | number
    | boolean
    | PartialJSONObject
    | PartialJSONArray
    | null
    | undefined;

  public name: string;
  public codemirror_mode?: string | PartialJSONObject | undefined;
  public file_extension?: string | undefined;
  public mimetype?: string | undefined;
  public pygments_lexer?: string | undefined;
}

// Local Cell.

export class LocalRawCell implements shared.ISharedRawCell {
  [key: string]:
    | string
    | number
    | boolean
    | PartialJSONObject
    | PartialJSONArray
    | null
    | undefined;

  public cell_type: 'raw';
  public metadata: Partial<IRawCellMetadata>;
  public attachments?: IAttachments | undefined;
  public source: MultilineString;
}

// Local Cell Metadata.

export class LocalCodeCellMetadata implements shared.ISharedCodeCellMetadata {
  [key: string]: PartialJSONValue;

  constructor() {
    this._collapsed = false;
    this._jupyter = new LocalCodeCellJupyterMetadata();
    this._scrolled = false;
    this._trusted = false;
    this._name = '';
    this._tags = [];
  }

  public collapsed: boolean;
  public jupyter: Partial<shared.ISharedCodeCellJupyterMetadata>;
  public scrolled: boolean | 'auto';
  public trusted: boolean;
  public name: string;
  public tags: string[];
}

export class LocalCodeCellJupyterMetadata
  implements shared.ISharedCodeCellJupyterMetadata {
  [key: string]: PartialJSONValue;

  public outputs_hidden: boolean;
  public source_hidden: boolean;
}

export class LocalCellJupyterMetadata
  implements shared.ISharedCellJupyterMetadata {
  [key: string]: PartialJSONValue;

  public source_hidden: boolean = false;
}
