// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { describe, galata, test } from '@jupyterlab/galata';

jest.setTimeout(60000);

const DEFAULT_NAME = 'untitled.txt';

describe('Text Editor Tests', () => {
  beforeAll(async () => {
    await galata.resetUI();
    galata.context.capturePrefix = 'text-editor';
  });

  afterAll(async () => {
    galata.context.capturePrefix = '';
  });

  test('Open a text editor', async () => {
    const imageName = 'text-editor';
    await galata.filebrowser.openHomeDirectory();
    await galata.menu.clickMenuItem('File>New>Text File');

    await galata.context.page.waitForSelector(
      `[role="main"] >> text=${DEFAULT_NAME}`
    );

    const tabHandle = await galata.activity.getPanel(DEFAULT_NAME);
    await galata.capture.screenshot(imageName, tabHandle);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Changing a text editor settings', async () => {
    const imageName = 'text-editor-rulers';
    await galata.menu.clickMenuItem('Settings>Advanced Settings Editor');

    const page = galata.context.page;
    await page.click('text=Text Editor');
    await page.dblclick('pre[role="presentation"]:has-text("{}")');
    await page.keyboard.type('{"editorConfig":{"rulers":[50, 75]}}');
    await page.click('button:has-text("Save User Settings")');

    await page.waitForResponse(
      /.*api\/settings\/@jupyterlab\/fileeditor-extension:plugin/
    );

    await galata.activity.activateTab(DEFAULT_NAME);

    const tabHandle = await galata.activity.getPanel(DEFAULT_NAME);
    await galata.capture.screenshot(imageName, tabHandle);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Remove created file', async () => {
    await galata.filebrowser.openHomeDirectory();
    expect(await galata.contents.deleteFile(DEFAULT_NAME)).toEqual(true);
  });
});
