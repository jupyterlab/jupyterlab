// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';

const FIRST_PLUGIN_SELECTOR =
  '.jp-pluginmanager-AvailableList tr:first-child input[type="checkbox"]';
const DISCLAIMER_SELECTOR = '.jp-pluginmanager-Disclaimer-checkbox';

test.use({
  viewport: { height: 720, width: 1280 }
});

test.describe('Advanced Plugin Manager', () => {
  test('Opens with a specific search query', async ({ page }) => {
    await page.evaluate(async () => {
      await window.jupyterapp.commands.execute('pluginmanager:open', {
        query: 'Notebook'
      });
    });

    const value = await page
      .locator('.jp-pluginmanager jp-search')
      .evaluate(elem => elem.value);

    expect(value).toEqual('Notebook');

    const pluginManager = page.locator('.jp-pluginmanager');
    await page.sidebar.close('left');

    // Taking a snapshot after filtering to reduce noise as plugins are developed
    expect(await pluginManager.screenshot()).toMatchSnapshot(
      'plugin_manager_search_notebook.png'
    );
  });

  test('Allows to disable plugins after disclaiming', async ({ page }) => {
    await page.evaluate(async () => {
      await window.jupyterapp.commands.execute('pluginmanager:open', {
        query: '@jupyterlab/application-extension:logo'
      });
    });
    const disclaimerCheckbox = page.locator(DISCLAIMER_SELECTOR);
    const pluginCheckbox = page.locator(FIRST_PLUGIN_SELECTOR);

    expect(await disclaimerCheckbox.isChecked()).toEqual(false);
    expect(await pluginCheckbox.isDisabled()).toEqual(true);
    expect(await pluginCheckbox.isChecked()).toEqual(true);

    await disclaimerCheckbox.check();

    expect(await disclaimerCheckbox.isChecked()).toEqual(true);
    expect(await pluginCheckbox.isDisabled()).toEqual(false);
    expect(await pluginCheckbox.isChecked()).toEqual(true);
  });

  test('Warns if plugin to be disabled is used by other plugins', async ({
    page
  }) => {
    await page.evaluate(async () => {
      // The command paltte should not be required by any plugins,
      // but is used by many. There are multiple plugins starting
      // with `@jupyterlab/apputils-extension:palette`,
      // so instead we use the token name for filtering.
      await window.jupyterapp.commands.execute('pluginmanager:open', {
        query: 'ICommandPalette'
      });
    });
    const disclaimerCheckbox = page.locator(DISCLAIMER_SELECTOR);
    const pluginCheckbox = page.locator(FIRST_PLUGIN_SELECTOR);

    await disclaimerCheckbox.check();
    await pluginCheckbox.click();

    const dialog = page.locator('.jp-Dialog-content', {
      hasText: 'This plugin is used by other plugins'
    });
    await expect(dialog).toHaveCount(1);
    expect(await dialog.screenshot()).toMatchSnapshot(
      'plugin_manager_plugin_in_use_warning.png'
    );
  });

  test('Blocks disabling required plugin with an explanation', async ({
    page
  }) => {
    await page.evaluate(async () => {
      await window.jupyterapp.commands.execute('pluginmanager:open', {
        query: 'INotebookTracker'
      });
    });
    const disclaimerCheckbox = page.locator(DISCLAIMER_SELECTOR);
    const pluginCheckbox = page.locator(FIRST_PLUGIN_SELECTOR);

    await disclaimerCheckbox.check();
    await pluginCheckbox.click();

    const dialog = page.locator('.jp-Dialog-content', {
      hasText: 'This plugin is required by other plugins'
    });
    await expect(dialog).toHaveCount(1);
    expect(await dialog.screenshot()).toMatchSnapshot(
      'plugin_manager_plugin_required_warning.png'
    );
  });

  test('Prevents disabling locked plugins', async ({ page }) => {
    await page.evaluate(async () => {
      await window.jupyterapp.commands.execute('pluginmanager:open', {
        query: '@jupyterlab/pluginmanager-extension:plugin'
      });
    });
    const disclaimerCheckbox = page.locator(DISCLAIMER_SELECTOR);
    const pluginCheckbox = page.locator(FIRST_PLUGIN_SELECTOR);

    await disclaimerCheckbox.check();
    expect(await pluginCheckbox.isDisabled()).toEqual(true);

    const lockIcon = page.locator('[data-icon="ui-components:lock"]');
    await expect(lockIcon).toHaveCount(1);

    const pluginRow = page.locator(
      '[data-key="@jupyterlab/pluginmanager-extension:plugin"]'
    );
    expect(await pluginRow.screenshot()).toMatchSnapshot(
      'plugin_manager_plugin_locked.png'
    );
  });
});
