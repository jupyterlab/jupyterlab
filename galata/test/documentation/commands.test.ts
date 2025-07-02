// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';
import * as fs from 'fs-extra';

test('All commands must have a default label and describedBy', async ({
  page
}, testInfo) => {
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
      args?: any;
    }[] = [];

    for (const id of commandIds
      .filter(id => !id.startsWith('_') && !id.startsWith('@jupyter-widgets'))
      .sort()) {
      try {
        let args: any = undefined;
        try {
          // Try to get the describedBy information (command arguments schema)
          const description = await registry.describedBy(id);
          if (description && description.args) {
            args = description.args;
          }
        } catch (error) {
          // If describedBy fails or returns nothing, args remains undefined
          console.debug(`No args description for ${id}:`, error);
        }

        commands.push({
          id,
          label: registry.label(id),
          caption: registry.caption(id),
          shortcuts: [
            ...(shortcuts.find(shortcut => shortcut.command === id)?.keys ?? [])
          ],
          args
        });
      } catch (reason) {
        console.error(reason);
        commands.push({
          id,
          label: '',
          caption: '',
          shortcuts: [
            ...(shortcuts.find(shortcut => shortcut.command === id)?.keys ?? [])
          ]
        });
      }
    }

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

  // Check for commands missing describedBy information
  const missingDescribedBy = commands.filter(command => !command.args);

  // Log commands without describedBy for debugging
  if (missingDescribedBy.length > 0) {
    console.log(
      'Commands missing describedBy information:',
      missingDescribedBy.map(cmd => cmd.id)
    );
  }

  expect(missingDescribedBy).toEqual([]);
});
