// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLabPlugin
} from '../application';

import {
  IStateDB
} from './index';

import {
  StateDB
} from './statedb';


/**
 * The default state database for storing application state.
 */
export
const stateProvider: JupyterLabPlugin<IStateDB> = {
  id: 'jupyter.services.statedb',
  activate: (): IStateDB => new StateDB(),
  autoStart: true,
  provides: IStateDB
};
