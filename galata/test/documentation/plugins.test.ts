// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { test } from '@jupyterlab/galata';
import { Token } from '@lumino/coreutils';
import { expect } from '@playwright/test';
import * as fs from 'fs-extra';

// As the test is run in the documentation environment, some plugins and tokens are not from core.
const IGNORED_PLUGINS = [
  /^@jupyterlab\/geojson-extension:factory$/,
  /^@jupyterlab\/galata-extension:helpers$/,
  /^@jupyter-widgets\//,
  /^jupyterlab_pygments/
];

test('All plugins and tokens must have a description', async ({
  page
}, testInfo) => {
  const { plugins, tokens } = await page.evaluate(async ignored => {
    const pluginIDs = window.jupyterapp.listPlugins();
    pluginIDs.sort();

    const plugins: Record<string, string> = {};
    const tokens: Record<string, string | undefined> = {};
    pluginIDs.forEach(id => {
      if (
        !id.startsWith('@jupyterlab/') ||
        ignored.some(pattern => pattern.test(id))
      ) {
        return;
      }

      plugins[id] = window.jupyterapp.getPluginDescription(id);
      const plugin = (
        (window.jupyterapp as any).pluginRegistry._plugins as Map<
          string,
          { provides: Token<any> | null }
        >
      ).get(id);
      if (plugin?.provides) {
        const token = plugin.provides;
        tokens[token.name] = token.description;
      }
    });

    // sort the tokens
    const tokenKeys = Object.keys(tokens).sort();
    const sortedTokens: Record<string, string | undefined> = {};
    tokenKeys.forEach(key => {
      sortedTokens[key] = tokens[key];
    });

    return Promise.resolve({ plugins, tokens: sortedTokens });
  }, IGNORED_PLUGINS);

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

test('Plugins must be named using the same convention', async ({
  page
}, testInfo) => {
  const pluginIDs = await page.evaluate(async ignored => {
    return window.jupyterapp.listPlugins().filter(id => {
      return !ignored.some(pattern => pattern.test(id));
    });
  }, IGNORED_PLUGINS);

  // Create a list so it's easier to find the plugins not following the convention
  const invalidNames = pluginIDs.filter(id => {
    // Plugin ids should match the @jupyterlab/<name>-extension:<type> convention
    const pattern = /^@jupyterlab\/[a-z0-9-]+?-extension:[a-zA-Z0-9-]+$/;
    return !pattern.test(id);
  });

  expect(invalidNames).toEqual([]);
});
