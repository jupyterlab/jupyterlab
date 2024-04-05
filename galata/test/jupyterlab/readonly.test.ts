/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, galata, test } from '@jupyterlab/galata';

test.describe('test readonly status', () => {
  test('test readonly status', async ({ page }) => {
    await page.notebook.createNew('notebook.ipynb');
    // We need to save the notebook to preserve the default kernel choice
    // otherwise when we reopen it, it would show "Select Kernel" dialog,
    // which adds a semi-transparent layer above the notification.
    const notSavedIndicator = page
      .getByRole('main')
      .getByRole('tablist')
      .locator('.jp-mod-dirty');
    await notSavedIndicator.waitFor();
    await page.notebook.save();

    await galata.Mock.makeNotebookReadonly(page);

    // have to open and close notebook for notification to show up
    await page.notebook.close();
    await page.notebook.open('notebook.ipynb');

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
