// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

const fetch = require('node-fetch');

import { JupyterServer } from '../src';
import { URLExt } from '@jupyterlab/coreutils';

describe('JupyterServer', () => {
  it('should start the server', async () => {
    jest.setTimeout(20000);
    const server = new JupyterServer();
    const url = await server.start();
    await fetch(URLExt.join(url, 'api'));
    await server.shutdown();
  });
});
