// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { test } from '@jupyterlab/galata';

test('Open the settings editor with a specific search query', async ({
  page
}) => {
  await window.jupyterapp.commands.execute('settingeditor:open', {
    label: 'Open command palette settings',
    query: 'Command Palette'
  });

  expect(
    await page.locator('.jp-PluginList .jp-FilterBox input').inputValue()
  ).toEqual('Command Palette');
});
