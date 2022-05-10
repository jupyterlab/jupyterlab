// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import * as fs from 'fs-extra';

test('All commands must have a default label', async ({ page }, testInfo) => {
  const commands = await page.evaluate(async () => {
    const registry = window.jupyterapp.commands;
    const shortcuts = registry.keyBindings;
    const commandIds = registry.listCommands();

    // Get more information about the commands
    const commands: {
      id: string;
      label: string;
      caption: string;
      shortcuts?: string[];
    }[] = commandIds
      .filter(id => !id.startsWith('_') && !id.startsWith('@jupyter-widgets'))
      .sort()
      .map(id => {
        try {
          return {
            id,
            label: registry.label(id),
            caption: registry.caption(id),
            shortcuts: [
              ...(shortcuts.find(shortcut => shortcut.command === id)?.keys ??
                [])
            ]
          };
        } catch (reason) {
          console.error(reason);
          return {
            id,
            label: '',
            caption: '',
            shortcuts: [
              ...(shortcuts.find(shortcut => shortcut.command === id)?.keys ??
                [])
            ]
          };
        }
      });

    return Promise.resolve(commands);
  });

  if (!(await fs.pathExists(testInfo.snapshotDir))) {
    await fs.mkdir(testInfo.snapshotDir);
  }
  await fs.writeJSON(testInfo.snapshotPath('commandsList.json'), commands, {
    encoding: 'utf-8',
    spaces: 2
  });

  // All commands must at least define a label
  const missingLabel = commands.filter(command => !command.label);

  expect(missingLabel).toEqual([]);
});
