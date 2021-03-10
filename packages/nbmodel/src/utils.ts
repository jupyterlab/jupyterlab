/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  IObservableJSON,
  IObservableList,
  IObservableString
} from '@jupyterlab/observables';

import Delta from 'quill-delta';

import * as nbmodel from './api';

/**
 * @deprecated
 */
export function asJsonChange(
  cellChange: nbmodel.MapChange
): IObservableJSON.IChangedArgs[] {
  throw new Error('Method not implemented.');
}

/**
 * @deprecated
 */
export function asStringChange(delta: Delta): IObservableString.IChangedArgs[] {
  throw new Error('Method not implemented.');
}

/**
 * @deprecated
 */
export function asListChange(
  delta: Delta
): IObservableList.IChangedArgs<any>[] {
  throw new Error('Method not implemented.');
}
