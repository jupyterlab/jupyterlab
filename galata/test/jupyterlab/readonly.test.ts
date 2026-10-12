/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type { IJupyterLabPageFixture } from '@jupyterlab/galata';
import { expect, galata, test } from '@jupyterlab/galata';

const writableNotebook = 'notebook-writable.ipynb';
const readonlyNotebook = 'notebook-readonly.ipynb';

const READONLY_HIDDEN_ITEMS = ['save', 'insert', 'cut', 'paste', 'run'];
const ALWAYS_VISIBLE_ITEMS = ['copy'];
const WRITABLE_ONLY_ITEMS = ['save', 'insert', 'cut', 'paste', 'run'];

async function assertReadonlyToolbar(
  page: IJupyterLabPageFixture
): Promise<void> {
  const panel = await page.activity.getPanelLocator(readonlyNotebook);
  const toolbar = panel!.locator('.jp-NotebookPanel-toolbar');

  for (const name of ALWAYS_VISIBLE_ITEMS) {
    await expect(
      toolbar.locator(`[data-jp-item-name="${name}"]`)
    ).toBeVisible();
  }
  for (const name of READONLY_HIDDEN_ITEMS) {
    await expect(
      toolbar.locator(`[data-jp-item-name="${name}"]`)
    ).not.toBeVisible();
  }
}

async function assertWritableToolbar(
  page: IJupyterLabPageFixture
): Promise<void> {
  const panel = await page.activity.getPanelLocator(writableNotebook);
  const toolbar = panel!.locator('.jp-NotebookPanel-toolbar');

  for (const name of [...ALWAYS_VISIBLE_ITEMS, ...WRITABLE_ONLY_ITEMS]) {
    await expect(
      toolbar.locator(`[data-jp-item-name="${name}"]`)
    ).toBeVisible();
  }
}

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
});

test.describe('Notebook toolbar visibility with read-only and writable notebooks', () => {
  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS
    }
  });

  test('Toolbar buttons reflect notebook state regardless of focused panel', async ({
    page
  }) => {
    // Create the writable notebook.
    await page.notebook.createNew(writableNotebook);

    // Create the second notebook via menu directly: a second call to
    // page.notebook.createNew is not robust because the kernel dialog
    // may not appear when a kernel is already running.
    await page.menu.clickMenuItem('File>New>Notebook');
    try {
      await page.locator('.jp-Dialog').waitFor({ timeout: 5000 });
      await page.click('.jp-Dialog .jp-mod-accept');
    } catch {
      // no-op: dialog may not appear if a kernel is already running
    }

    // Rename the new notebook so it can be reliably located later.
    const currentDir = await page.filebrowser.getCurrentDirectory();
    const assignedTab = page.activity.getTabLocator();
    const assignedName = await assignedTab
      .locator('.lm-TabBar-tabLabel')
      .textContent();
    await page.contents.renameFile(
      `${currentDir}/${assignedName}`,
      `${currentDir}/${readonlyNotebook}`
    );

    // Reopen as read-only: close, activate the mock, then reopen without kernel.
    await page.notebook.close();
    await galata.Mock.makeNotebookReadonly(page);
    await page.notebook.open(readonlyNotebook, { noKernel: true });

    // Split the read-only notebook to the right of the writable notebook.
    const readonlyTab = page.activity.getTabLocator(readonlyNotebook);
    const readonlyTabBBox = await readonlyTab.boundingBox();
    await page.mouse.move(
      readonlyTabBBox!.x + 0.5 * readonlyTabBBox!.width,
      readonlyTabBBox!.y + 0.5 * readonlyTabBBox!.height
    );
    await page.mouse.down();
    await page.mouse.move(
      900,
      readonlyTabBBox!.y + readonlyTabBBox!.height + 200
    );
    await page.mouse.up();

    // Focus the writable notebook and open a console from it (opens split-bottom).
    await page.activity.activateTab(writableNotebook);
    await page.menu.clickMenuItem('File>New Console for Notebook');

    // Wait for the console to be ready.
    await page
      .locator('.jp-CodeConsole [aria-label="Code Cell Content"]')
      .waitFor();
    await page.locator('text=| Idle').waitFor();

    // Check toolbar visibility for each focused panel.
    for (const tabName of [readonlyNotebook, writableNotebook, /Console/] as (
      | string
      | RegExp
    )[]) {
      await page.pause();
      await page.activity.activateTab(tabName);
      await assertReadonlyToolbar(page);
      await assertWritableToolbar(page);
    }
  });
});
