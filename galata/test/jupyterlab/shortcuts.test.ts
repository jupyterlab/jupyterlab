// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';

const DUPLICATE_SHORTCUT_WARNING =
  'Skipping this default shortcut because it collides with another default shortcut.';

test.use({ autoGoto: false });

test('Shortcut commands must exist', async ({ page }) => {
  await page.goto();

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

test('Shortcuts must be unique', async ({ page }) => {
  const warnings: string[] = [];

  page.on('console', message => {
    if (message.type() === 'warning') {
      warnings.push(message.text());
    }
  });

  await page.goto();

  expect(
    warnings
      .filter(s => s.startsWith(DUPLICATE_SHORTCUT_WARNING))
      // List warning messages only once
      .reduce((agg, message) => {
        if (!agg.includes(message)) {
          agg.push(message);
        }
        return agg;
      }, [])
  ).toEqual([]);
});
