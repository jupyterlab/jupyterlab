// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

const CELL_EDITOR_SELECTOR = '.jp-InputArea-editor';
const CODE_MIRROR_CURSOR = '.cm-cursor';

test.describe('Console', () => {
  test.beforeEach(async ({ page }) => {
    await page.menu.clickMenuItem('File>New>Console');

    await page.click('button:has-text("Select")');

    await page.locator('[aria-label="Code Cell Content"]').waitFor();
    await page.locator('text=| Idle').waitFor();
  });

  test('Executed cells should become read-only', async ({ page }) => {
    await page.keyboard.type('2 + 2');
    await page.keyboard.press('Shift+Enter');

    const executedCell = page.locator(
      '[aria-label="Code Cell Content with Output"]'
    );
    await executedCell.waitFor();

    const cellEditor = executedCell.locator(CELL_EDITOR_SELECTOR);
    expect(await cellEditor.innerText()).toBe('2 + 2');

    // Focus the editor
    await cellEditor.click();

    // Should not display the cursor
    const cursor = cellEditor.locator(CODE_MIRROR_CURSOR);
    await expect.soft(cursor).toBeHidden();

    // Try to type something into the editor
    await cellEditor.type('more text');

    // Expect the editor content to not change
    expect(await cellEditor.innerText()).toBe('2 + 2');
  });
});
