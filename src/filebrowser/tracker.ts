// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISignal
} from 'phosphor/lib/core/signaling';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  IChangedArgs
} from '../common/interfaces';


/* tslint:disable */
/**
 * The path tracker token.
 */
export
const IPathTracker = new Token<IPathTracker>('jupyter.services.file-browser');
/* tslint:enable */


/**
 * An interface a file browser path tracker.
 */
export
interface IPathTracker {
  /**
   * A signal emitted when the current path changes.
   */
  pathChanged: ISignal<IPathTracker, IChangedArgs<string>>;

  /**
   * The current path of the filebrowser.
   */
  readonly path: string;
}
