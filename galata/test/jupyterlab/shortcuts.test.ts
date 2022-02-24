// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';

test('Shortcut commands must exists', async ({ page }) => {
  const [shortcuts, commands] = await page.evaluate(async () => {
    const shortcuts = window.jupyterapp.commands.keyBindings;
    const commandIds = window.jupyterapp.commands.listCommands();

    return Promise.resolve([shortcuts, commandIds]);
  });

  const missingCommands = shortcuts.filter(
    shortcut => !commands.includes(shortcut.command)
  );

  expect(missingCommands).toEqual([]);
});
