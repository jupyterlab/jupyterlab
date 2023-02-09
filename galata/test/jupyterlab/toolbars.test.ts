// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { test } from '@jupyterlab/galata';
import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import { expect } from '@playwright/test';

const toolbars: string[][] = [
  ['@jupyterlab/csvviewer-extension:csv', 'toolbar'],
  ['@jupyterlab/csvviewer-extension:tsv', 'toolbar'],
  ['@jupyterlab/fileeditor-extension:plugin', 'toolbar'],
  ['@jupyterlab/htmlviewer-extension:plugin', 'toolbar'],
  ['@jupyterlab/notebook-extension:panel', 'toolbar']
];

toolbars.forEach(([plugin, parameter]) => {
  test(`Toolbar commands for ${plugin} must exists`, async ({ page }) => {
    const [toolbarItems, commands] = await page.evaluate(
      async ([plugin, parameter]) => {
        const settings = await window.galata.getPlugin(
          '@jupyterlab/apputils-extension:settings'
        );
        const toolbar = await settings.get(plugin, parameter);

        const commandIds = window.jupyterapp.commands.listCommands();
        return Promise.resolve([
          toolbar.composite as ISettingRegistry.IToolbarItem[],
          commandIds
        ]);
      },
      [plugin, parameter]
    );

    const missingCommands = toolbarItems.filter(
      item => item.command !== undefined && !commands.includes(item.command)
    );
    expect(missingCommands).toEqual([]);
  });
});
