// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ConfigSectionManager,
  ConfigWithDefaults,
  ServerConnection
} from '@jupyterlab/services';

import { log } from './log';

export async function main(): Promise<void> {
  log('Config');
  // The base url of the Jupyter server.

  const serverSettings = ServerConnection.makeSettings();
  const configSectionManager = new ConfigSectionManager({ serverSettings });
  const section = await configSectionManager.create({ name: 'notebook' });
  const config = new ConfigWithDefaults({
    section,
    defaults: { default_cell_type: 'code' },
    className: 'Notebook'
  });
  log(config.get('default_cell_type')); // 'code'
  const data = await config.set('foo', 'bar');
  log(data);
}
