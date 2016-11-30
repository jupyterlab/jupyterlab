// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

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
  provides: IStateDB,
  requires: [ICommandPalette]
};


/**
 * Activate the state database.
 */
function activateState(app: JupyterLab, palette: ICommandPalette): Promise<IStateDB> {
  let state = new StateDB();
  let jupyter = (window as any).jupyter;
  let version = jupyter ? jupyter.version : 'unknown';
  let command = 'statedb:clear';
  let category = 'Help';
  let key = 'statedb:version';
  let fetch = state.fetch(key);
  let save = () => state.save(key, { version });
  let reset = () => state.clear().then(save);
  let check = (value: JSONObject) => {
    let old = value && (value as any).version;
    if (!old || old !== version) {
      console.log(`Upgraded: ${old || 'unknown'} to ${version}; Resetting DB.`);
      return reset();
    }
  };

  app.commands.addCommand(command, {
    label: 'Clear Application Restore State',
    execute: () => state.clear()
  });

  palette.addItem({ command, category });

  return fetch.then(check, reset).then(() => state);
}
