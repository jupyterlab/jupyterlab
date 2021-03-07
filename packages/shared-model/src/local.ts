/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as nbformat from '@jupyterlab/nbformat';

import { PartialJSONValue } from '@lumino/coreutils';

import { ISharedCellJupyterMetadata, ISharedCodeCellMetadata } from './api';

export class LocalCellJupyterMetadata implements ISharedCellJupyterMetadata {
  [key: string]: PartialJSONValue | undefined;

  get source_hidden() {
    return this._source_hidden;
  }

  private _source_hidden: boolean = false;
}

export class LocalCodeCellMetadata implements ISharedCodeCellMetadata {
  [key: string]: PartialJSONValue | undefined;

  get collapsed() {
    return this._collapsed;
  }

  get jupyter() {
    return this._jupyter;
  }

  get scrolled() {
    return this._scrolled;
  }

  get trusted() {
    return this._trusted;
  }

  get name() {
    return this._name;
  }

  get tags() {
    return this._tags;
  }

  private _collapsed: boolean = false;
  private _jupyter: Partial<nbformat.ICodeCellJupyterMetadata> = {
    outputs_hidden: false,
    source_hidden: false
  };
  private _scrolled: boolean | 'auto' = false;
  private _trusted: boolean = false;
  private _name: string = '';
  private _tags: string[] = [];
}
