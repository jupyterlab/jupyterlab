// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Contents
} from '@jupyterlab/services';

import {
  IIterator
} from '@phosphor/algorithm';

import {
  Token
} from '@phosphor/coreutils';

import {
  ISignal
} from '@phosphor/signaling';

import {
  IChangedArgs
} from '@jupyterlab/coreutils';


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
   * A signal emitted when the directory listing is refreshed.
   */
  refreshed: ISignal<IPathTracker, void>;

  /**
   * Get the file path changed signal.
   */
  fileChanged: ISignal<IPathTracker, Contents.IChangedArgs>;

  /**
   * A signal emitted when the tracker loses connection.
   */
  connectionFailure: ISignal<IPathTracker, Error>;

  /**
   * The current path of the tracker.
   */
  readonly path: string;

  /**
   * Create an iterator over the tracker's items.
   *
   * @returns A new iterator over the model's items.
   */
  items(): IIterator<Contents.IModel>;

  /**
   * Force a refresh of the directory contents.
   */
  refresh(): Promise<void>;
}
