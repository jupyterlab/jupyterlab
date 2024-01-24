/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, galata, test } from '@jupyterlab/galata';

test.describe('test readonly status', () => {
  test('test readonly status', async ({ page }) => {
    await galata.Mock.makeNotebookReadonly(page);
    await page.notebook.createNew('notebook.ipynb');

    // have to open and close notebook for notification to show up
    await page.notebook.close();
    await page.notebook.open('notebook.ipynb');

    await page.keyboard.press('Control+s');

    const imageName = 'readonly.png';
    const toast = page.locator('.Toastify__toast');
    await toast.waitFor({ state: 'attached' });
    // For some reason even `{animations: "disabled"}` is flaky.
    // Instead we just wait a short while.
    await page.waitForTimeout(2000);
    expect(await toast.screenshot()).toMatchSnapshot(imageName);
  });
});
