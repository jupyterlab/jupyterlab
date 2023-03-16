// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

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

    await page.getByRole('main').getByText(DEFAULT_NAME).waitFor();

    await page.menu.clickMenuItem('Settings>Settings Editor');

    await page
      .getByRole('tab', { name: 'Text Editor' })
      .getByText('Text Editor')
      .click();

    // Add two rulers
    await page.locator('#root').getByRole('button', { name: 'Add' }).click();
    await page.locator('input[id="root_rulers_0"]').type('50');
    await page.locator('#root').getByRole('button', { name: 'Add' }).click();
    await page.locator('input[id="root_rulers_1"]').type('75');

    await page.activity.activateTab(DEFAULT_NAME);

    const tabHandle = await page.activity.getPanel(DEFAULT_NAME);

    expect(await tabHandle.screenshot()).toMatchSnapshot(imageName);
  });

  test('Go to line with argument', async ({ page }) => {
    const imageName = 'go-to-line-editor.png';
    await page.menu.clickMenuItem('File>New>Text File');

    await page.waitForSelector(`[role="main"] >> text=${DEFAULT_NAME}`);

    await page.type(
      '.cm-content',
      `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam urna
libero, dictum a egestas non, placerat vel neque. In imperdiet iaculis fermentum.
Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia
Curae; Cras augue tortor, tristique vitae varius nec, dictum eu lectus. Pellentesque
id eleifend eros. In non odio in lorem iaculis sollicitudin. In faucibus ante ut
arcu fringilla interdum. Maecenas elit nulla, imperdiet nec blandit et, consequat
ut elit.`
    );

    await page.evaluate(async () => {
      await window.jupyterapp.commands.execute('fileeditor:go-to-line', {
        line: 2,
        column: 8
      });
    });

    await page.keyboard.type('#2:8#');

    const tabHandle = await page.activity.getPanel(DEFAULT_NAME);
    expect(await tabHandle.screenshot()).toMatchSnapshot(imageName);
  });
});
