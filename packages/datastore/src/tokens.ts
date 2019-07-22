// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@phosphor/coreutils';

export const IDataStore = new Token<IDataStore>(
  '@jupyterlab/completer:IDataStore'
);

/**
 * A manager to register completers with parent widgets.
 */
export interface IDataStore {
  test(): void;
}
