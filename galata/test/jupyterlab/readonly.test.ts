/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, galata, test } from '@jupyterlab/galata';

test.describe('test kernel history keybindings', () => {
  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/notebook-extension:tracker': {
        accessKernelHistory: true
      }
    }
  });
  test('Use history keybindings', async ({ page }) => {
    await galata.Mock.makeNotebookReadonly(page);
    await page.notebook.createNew('notebook.ipynb');

    const imageName = 'readonly.png';
    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(imageName);
    expect(0).toBe(1);
  });
});
