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

    // The read-only indicator should show in the toolbar when a read-only
    // document is opened.
    const readOnlyIndicator = page
      .getByRole('main')
      .locator('[data-jp-item-name="read-only-indicator"]');
    await expect(readOnlyIndicator).toBeVisible();
    await expect(readOnlyIndicator).toContainText('read-only');

    const insertButton = await page.notebook.getToolbarItemLocator('insert');
    if (insertButton) {
      await expect(insertButton).not.toBeVisible();
    }

    // Typing into the cell editor should have no effect.
    const originalSource = await page.notebook.getCellTextInput(0);
    const cellInput = await page.notebook.getCellInputLocator(0);
    await cellInput!.click();
    await page.keyboard.type('this should not be inserted');
    expect(await page.notebook.getCellTextInput(0)).toEqual(originalSource);

    await page.keyboard.press('Control+s');

    const imageName = 'readonly.png';
    const toast = page.locator('.Toastify__toast');
    const toastAnimation = page.locator('.Toastify--animate');
    await toast.waitFor({ state: 'attached' });
    await toastAnimation.waitFor({ state: 'attached' });
    await toastAnimation.waitFor({ state: 'detached' });

    expect(await toast.screenshot()).toMatchSnapshot(imageName);
  });

  test('toolbars follow their own notebook', async ({ page, tmpPath }) => {
    const notebook = JSON.stringify({
      cells: [{ cell_type: 'code', metadata: {}, source: '1', outputs: [] }],
      metadata: {},
      nbformat: 4,
      nbformat_minor: 5
    });
    await page.contents.uploadContent(
      notebook,
      'text',
      `${tmpPath}/writable.ipynb`
    );
    await page.contents.uploadContent(
      notebook,
      'text',
      `${tmpPath}/readonly.ipynb`
    );
    await page.contents.uploadContent('text', 'text', `${tmpPath}/other.txt`);

    // Only `readonly.ipynb` is reported as not writable.
    await page.route(/\/api\/contents\/.*readonly\.ipynb/, async route => {
      if (route.request().method() !== 'GET') {
        return route.fallback();
      }
      const response = await route.fetch();
      const json = await response.json();
      await route.fulfill({ response, json: { ...json, writable: false } });
    });

    // Open the notebooks side by side, and a text file below them.
    await page.evaluate(async tmpPath => {
      const open = (path: string, mode?: string, factory?: string) =>
        window.jupyterapp.commands.execute('docmanager:open', {
          path: `${tmpPath}/${path}`,
          factory,
          kernelPreference: { shouldStart: false, shouldReuse: false },
          options: mode ? { mode } : undefined
        });
      await open('writable.ipynb', undefined, 'Notebook');
      await open('readonly.ipynb', 'split-right', 'Notebook');
      await open('other.txt', 'split-bottom');
    }, tmpPath);

    const panel = async (name: string) => {
      const id = await page.evaluate(name => {
        for (const widget of window.jupyterapp.shell.widgets('main')) {
          if ((widget as any).context?.path.endsWith(name)) {
            return widget.id;
          }
        }
        return null;
      }, name);
      return page.locator(`[id="${id}"]`);
    };
    const readonly = await panel('/readonly.ipynb');
    const writable = await panel('/writable.ipynb');
    await expect(
      readonly.locator('[data-jp-item-name="read-only-indicator"]')
    ).toBeVisible();

    const check = async () => {
      for (const name of ['insert', 'cut', 'run', 'restart']) {
        await expect(
          writable.locator(
            `.jp-NotebookPanel-toolbar [data-jp-item-name="${name}"]`
          )
        ).toBeVisible();
        await expect(
          readonly.locator(
            `.jp-NotebookPanel-toolbar [data-jp-item-name="${name}"]`
          )
        ).toBeHidden();
      }
      // The cell toolbar of the writable notebook keeps its buttons too (the
      // toolbar itself only shows in the active notebook).
      await expect(
        writable.locator(
          '.jp-cell-toolbar [data-jp-item-name="insert-cell-below"]'
        )
      ).not.toHaveClass(/lm-mod-hidden/);
    };

    // Focus each notebook in turn, then a document that is not a notebook.
    for (const name of ['readonly.ipynb', 'writable.ipynb', 'other.txt']) {
      await page.activity.activateTab(name);
      await check();
    }
  });
});
