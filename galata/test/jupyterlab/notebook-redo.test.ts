// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

const fileName = 'notebook.ipynb';

// On macOS redo is `Cmd Shift Z` only; the `Ctrl Y` and `Ctrl Shift Z`
// bindings exercised here are specific to Windows/Linux (see `editmenu:redo`
// in the mainmenu-extension schema), so this suite does not apply there.
test.describe('Notebook redo shortcuts (Windows/Linux)', () => {
  test.skip(
    process.platform === 'darwin',
    'Ctrl+Y / Ctrl+Shift+Z redo bindings are Windows/Linux only'
  );

  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(fileName);
  });

  for (const shortcut of ['Control+Shift+Z', 'Control+Y']) {
    test(`should redo with ${shortcut}`, async ({ page }) => {
      const text = 'redo target text';
      const cell = await page.notebook.getCellLocator(0);

      // Type some text into the first cell.
      await page.notebook.enterCellEditingMode(0);
      await page.keyboard.insertText(text);
      await expect(cell!).toContainText(text);

      // Undo the insertion with Ctrl+Z.
      await page.keyboard.press('Control+Z');
      await expect(cell!).not.toContainText(text);

      // Redo with the shortcut under test and confirm the text is restored.
      await page.keyboard.press(shortcut);
      await expect(cell!).toContainText(text);
    });
  }
});
