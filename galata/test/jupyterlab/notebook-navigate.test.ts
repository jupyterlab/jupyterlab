// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

const fileName = 'notebook.ipynb';

const READ_WRITE_CLASS = 'jp-mod-readWrite';

test.describe('Notebook Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(fileName);
  });

  test('Move to cell below with arrow down', async ({ page }) => {
    await page.notebook.addCell('code', 'first');
    await page.notebook.addCell('code', 'second');

    const firstCell = await page.notebook.getCellInputLocator(1);
    const secondCell = await page.notebook.getCellInputLocator(2);

    await page.notebook.enterCellEditingMode(1);

    // Check if first cell has focus
    await expect(firstCell!.locator('.cm-content')).toBeFocused();
    await expect(secondCell!.locator('.cm-content')).not.toBeFocused();

    // Make sure that .jp-mod-readWrite does not flicker when changing focus
    // from one cell to another, as that would cause layout trashing.
    await page.evaluate(attachNotebookMutationObserver);

    // Navigate to second cell
    await firstCell!.press('ArrowDown');

    // Check that second cell has focus
    await expect(firstCell!.locator('.cm-content')).not.toBeFocused();
    await expect(secondCell!.locator('.cm-content')).toBeFocused();

    const mutations = await page.evaluate(getNotebookMutations);

    // There should be zero changes to .jp-mod-readWrite (no flicker at all)
    const readWriteTransitions = mutations.filter(m => {
      return (
        m.type === 'attributes' &&
        m.name === 'class' &&
        m.old?.includes(READ_WRITE_CLASS) != m.new?.includes(READ_WRITE_CLASS)
      );
    });
    expect(readWriteTransitions.length).toBe(0);
  });
});

type WindowWithMutationObserver = Window & {
  notebookMutations: {
    old: string | null;
    new: string | null;
    type: string;
    name: string | null;
  }[];
};

function attachNotebookMutationObserver() {
  const win = window as unknown as WindowWithMutationObserver;
  win.notebookMutations = [];
  const notebook = document.querySelector('.jp-Notebook');
  if (!notebook) return;
  const observer = new MutationObserver((mutations: MutationRecord[]) => {
    for (const mutation of mutations) {
      win.notebookMutations.push({
        old: mutation.oldValue,
        new: notebook?.className ?? null,
        type: mutation.type,
        name: mutation.attributeName
      });
    }
  });
  observer.observe(notebook, {
    attributes: true,
    attributeOldValue: true
  });
}

function getNotebookMutations() {
  const win = window as unknown as WindowWithMutationObserver;
  return win.notebookMutations;
}
