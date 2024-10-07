// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { test } from '@jupyterlab/galata';
import { Token } from '@lumino/coreutils';
import { expect } from '@playwright/test';
import * as fs from 'fs-extra';

test('All plugins and tokens must have a description', async ({
  page
}, testInfo) => {
  const { plugins, tokens } = await page.evaluate(async () => {
    // As the test is ran in the documentation environments, some plugins and tokens are not from core.
    const IGNORED_PLUGINS = [
      '@jupyterlab/geojson-extension:factory',
      '@jupyterlab/galata-extension:helpers'
    ];

    const pluginIDs = window.jupyterapp.listPlugins();

    const plugins: Record<string, string> = {};
    const tokens: Record<string, string> = {};
    pluginIDs.forEach(id => {
      if (!id.startsWith('@jupyterlab/') || IGNORED_PLUGINS.includes(id)) {
        return;
      }

      plugins[id] = window.jupyterapp.getPluginDescription(id);
      const plugin = (
        (window.jupyterapp as any)._plugins as Map<
          string,
          { provides: Token<any> | null }
        >
      ).get(id);
      if (plugin?.provides) {
        const token = plugin.provides;
        tokens[token.name] = token.description;
      }
    });

    return Promise.resolve({ plugins, tokens });
  });

  if (!(await fs.pathExists(testInfo.snapshotDir))) {
    await fs.mkdir(testInfo.snapshotDir);
  }
  await fs.writeJSON(testInfo.snapshotPath('plugins.json'), plugins, {
    encoding: 'utf-8',
    spaces: 2
  });

  await fs.writeJSON(testInfo.snapshotPath('tokens.json'), tokens, {
    encoding: 'utf-8',
    spaces: 2
  });

  // All plugins must define a description
  const missingPluginDescriptions = Object.entries(plugins).filter(
    ([id, description]) => !description
  );
  // All tokens must define a description
  const missingTokenDescriptions = Object.entries(tokens).filter(
    ([id, description]) => !description
  );

  // Test against empty list to get directly the plugins/tokens missing description in test output
  expect.soft(missingPluginDescriptions).toEqual([]);
  expect(missingTokenDescriptions).toEqual([]);
});
