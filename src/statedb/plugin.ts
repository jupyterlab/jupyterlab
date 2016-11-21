// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

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
  activate: activateState,
  autoStart: true,
  provides: IStateDB
};


function activateState(): Promise<IStateDB> {
  let state = new StateDB();
  let version = (window as any).jupyter.version;
  let key = 'statedb:version';
  let fetch = state.fetch(key);
  let save = () => state.save(key, { version });
  let overwrite = () => state.clear().then(save);
  let check = (value: JSONObject) => {
    if (!value || (value as any).version !== version) {
      return overwrite();
    }
  };
  return fetch.then(check, overwrite).then(() => state);
}
