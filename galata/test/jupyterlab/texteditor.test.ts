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

    await page.menu.clickMenuItem('Settings>Advanced Settings Editor');

    await page.click('text=Text Editor');
    await page.dblclick('pre[role="presentation"]:has-text("{}")');
    await page.keyboard.type('{"editorConfig":{"rulers":[50, 75]}}');
    await page.click('button:has-text("Save User Settings")');

    await page.waitForResponse(
      /.*api\/settings\/@jupyterlab\/fileeditor-extension:plugin/
    );

    await page.activity.activateTab(DEFAULT_NAME);

    const tabHandle = await page.activity.getPanel(DEFAULT_NAME);

    expect(await tabHandle.screenshot()).toMatchSnapshot(imageName);
  });
});
