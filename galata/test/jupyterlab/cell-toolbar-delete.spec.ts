// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

test.describe('Cell Toolbar Delete Confirmation', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew();
    // Create two specific cells to identify deletions easily
    await page.notebook.setCell(0, 'code', 'print("cell-A")');
    await page.notebook.addCell('code', 'print("cell-B")');
    await page.notebook.run();
  });

  test('should show confirmation dialog and cancel deletion', async ({
    page
  }) => {
    await page.hover('.jp-Cell >> nth=0');

    await page
      .locator('.jp-Cell-toolbar button[title="Delete Cell"]')
      .first()
      .click();

    const dialog = page.locator('.jp-Dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      'Are you sure you want to delete this cell?'
    );

    await dialog.locator('button.jp-mod-reject').click();

    await expect(dialog).toBeHidden();
    expect(await page.notebook.getCellCount()).toBe(2);

    expect(await page.notebook.getCellTextInput(0)).toContain('cell-A');
  });

  test('should delete cell when confirmed', async ({ page }) => {
    await page.hover('.jp-Cell >> nth=0');
    await page
      .locator('.jp-Cell-toolbar button[title="Delete Cell"]')
      .first()
      .click();

    const dialog = page.locator('.jp-Dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('button.jp-mod-warn').click();

    await expect(dialog).toBeHidden();
    expect(await page.notebook.getCellCount()).toBe(1);
    expect(await page.notebook.getCellTextInput(0)).toContain('cell-B');
  });

  test('should respect "Do not ask me again" preference', async ({ page }) => {
    await page.hover('.jp-Cell >> nth=0');
    await page
      .locator('.jp-Cell-toolbar button[title="Delete Cell"]')
      .first()
      .click();

    const dialog = page.locator('.jp-Dialog');
    await expect(dialog).toBeVisible();

    // Check "Do not ask me again"
    await dialog.locator('input[type="checkbox"]').check();

    await dialog.locator('button.jp-mod-warn').click();

    // Verify first deletion worked
    expect(await page.notebook.getCellCount()).toBe(1);
    expect(await page.notebook.getCellTextInput(0)).toContain('cell-B');

    await page.hover('.jp-Cell >> nth=0');
    await page
      .locator('.jp-Cell-toolbar button[title="Delete Cell"]')
      .first()
      .click();

    // Verify dialog does NOT appear
    await page.waitForTimeout(200);
    await expect(dialog).toBeHidden();

    // Verify second deletion worked
    expect(await page.notebook.getCellCount()).toBe(1);
    const content = await page.notebook.getCellTextInput(0);
    expect(content).not.toContain('cell-B');
  });
});
