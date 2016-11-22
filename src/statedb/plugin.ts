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


/**
 * Activate the state database.
 */
function activateState(): Promise<IStateDB> {
  let state = new StateDB();
  let version = (window as any).jupyter.version;
  let key = 'statedb:version';
  let fetch = state.fetch(key);
  let save = () => state.save(key, { version });
  let reset = () => state.clear().then(save);
  let check = (value: JSONObject) => {
    let old = value && (value as any).version;
    if (!old || old !== version) {
      console.log(`Upgraded: ${old || 'unknown'} to ${version}. Resetting DB.`);
      return reset();
    }
  };
  return fetch.then(check, reset).then(() => state);
}
