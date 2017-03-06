// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IStateDB
} from './index';

import {
  CommandIDs, StateDB
} from './';


/**
 * The default state database for storing application state.
 */
const plugin: JupyterLabPlugin<IStateDB> = {
  activate,
  id: 'jupyter.services.statedb',
  autoStart: true,
  provides: IStateDB
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * Activate the state database.
 */
function activate(app: JupyterLab): Promise<IStateDB> {
  let state = new StateDB({ namespace: app.info.namespace });
  let version = app.info.version;
  let command = CommandIDs.clear;
  let key = 'statedb:version';
  let fetch = state.fetch(key);
  let save = () => state.save(key, { version });
  let reset = () => state.clear().then(save);
  let check = (value: JSONObject) => {
    let old = value && value['version'];
    if (!old || old !== version) {
      console.log(`Upgraded: ${old || 'unknown'} to ${version}; Resetting DB.`);
      return reset();
    }
  };

  app.commands.addCommand(command, {
    label: 'Clear Application Restore State',
    execute: () => state.clear()
  });

  return fetch.then(check, reset).then(() => state);
}
