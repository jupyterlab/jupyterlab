/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, galata, test } from '@jupyterlab/galata';

test.describe('test readonly status', () => {
  test('test readonly status', async ({ page }) => {
    await page.notebook.createNew('notebook.ipynb');
    await galata.Mock.makeNotebookReadonly(page);

    // have to open and close notebook for notification to show up
    await page.notebook.close();

    // We open the notebook without the kernel to avoid "Select Kernel",
    // which adds a semi-transparent layer above the notification.
    await page.notebook.open('notebook.ipynb', { noKernel: true });

    await page.keyboard.press('Control+s');

    const imageName = 'readonly.png';
    const toast = page.locator('.Toastify__toast');
    const toastAnimation = page.locator('.Toastify--animate');
    await toast.waitFor({ state: 'attached' });
    await toastAnimation.waitFor({ state: 'attached' });
    await toastAnimation.waitFor({ state: 'detached' });

    expect(await toast.screenshot()).toMatchSnapshot(imageName);
  });
});
