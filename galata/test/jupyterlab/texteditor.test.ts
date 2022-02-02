// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';

const DEFAULT_NAME = 'untitled.txt';

test.describe('Text Editor Tests', () => {
  test('Open a text editor', async ({ page }) => {
    const imageName = 'text-editor.png';
    await page.menu.clickMenuItem('File>New>Text File');

    await page.waitForSelector(`[role="main"] >> text=${DEFAULT_NAME}`);

    const tabHandle = await page.activity.getPanel(DEFAULT_NAME);
    expect(await tabHandle.screenshot()).toMatchSnapshot(imageName);
  });

  test('Changing a text editor settings', async ({ page }) => {
    const imageName = 'text-editor-rulers.png';
    await page.menu.clickMenuItem('File>New>Text File');

    await page.waitForSelector(`[role="main"] >> text=${DEFAULT_NAME}`);

    await page.menu.clickMenuItem('Settings>Settings Editor');

    await page.click('text=Text Editor');

    // Add two rulers
    await page.click('text="Add"');
    await page.click(
      '[id="jp-SettingsEditor-@jupyterlab/fileeditor-extension:plugin_editorConfig_rulers_0"]'
    );
    await page.type(
      '[id="jp-SettingsEditor-@jupyterlab/fileeditor-extension:plugin_editorConfig_rulers_0"]',
      '50'
    );
    await page.click('text="Add"');
    await page.click(
      '[id="jp-SettingsEditor-@jupyterlab/fileeditor-extension:plugin_editorConfig_rulers_1"]'
    );
    await page.type(
      '[id="jp-SettingsEditor-@jupyterlab/fileeditor-extension:plugin_editorConfig_rulers_1"]',
      '75'
    );

    await page.activity.activateTab(DEFAULT_NAME);

    const tabHandle = await page.activity.getPanel(DEFAULT_NAME);

    expect(await tabHandle.screenshot()).toMatchSnapshot(imageName);
  });
});
