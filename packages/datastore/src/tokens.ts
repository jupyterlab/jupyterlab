// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@phosphor/coreutils';
import { Datastore } from '@phosphor/datastore';

export interface IDatastore extends Datastore {}

export const IDatastore = new Token<IDatastore>(
  '@jupyterlab/completer:IDatastore'
);
