// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';
import * as path from 'path';

const fileName = 'tags.ipynb';

test.describe('Notebook tags', () => {
  test.beforeEach(async ({ page, tmpPath }) => {
    await page.contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );

    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    await page.notebook.activate(fileName);
    await page.getByText('Python 3 (ipykernel) | Idle').waitFor();
  });

  test('should set data-tags', async ({ page }) => {
    const codesCells = page.locator('.jp-CodeCell');

    await expect.soft(codesCells).toHaveCount(3);
    await expect
      .soft(codesCells.first())
      .toHaveAttribute('data-tags', 'banana');
    await expect.soft(codesCells.nth(1)).toHaveAttribute('data-tags', 'orange');
    expect.soft(await codesCells.last().getAttribute('data-tags')).toBeNull();

    const mdCells = page.locator('.jp-MarkdownCell');

    await expect.soft(mdCells).toHaveCount(3);
    await expect.soft(mdCells.first()).toHaveAttribute('data-tags', 'orange');
    await expect.soft(mdCells.nth(1)).toHaveAttribute('data-tags', 'banana');
    expect.soft(await mdCells.last().getAttribute('data-tags')).toBeNull();

    const rawCells = page.locator('.jp-RawCell');

    await expect.soft(rawCells).toHaveCount(3);
    await expect.soft(rawCells.first()).toHaveAttribute('data-tags', 'cherry');
    await expect
      .soft(rawCells.nth(1))
      .toHaveAttribute('data-tags', 'banana,orange');
    expect(await rawCells.last().getAttribute('data-tags')).toBeNull();
  });

  test('should filter on tag', async ({ page }) => {
    await page.getByRole('tab', { name: 'Property Inspector' }).click();
    await page.getByText('Common Tools').click();
    await page.getByRole('button', { name: 'Filter Cells' }).click();
    await page
      .getByRole('listitem')
      .filter({ hasText: 'orange' })
      .getByRole('checkbox')
      .click();
    await page.pause();
    await page.getByRole('button', { name: 'Filter Cell(s)' }).click();

    const visibleCells = page.locator('.jp-Cell[data-tags*="orange"]');

    await expect.soft(visibleCells).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect
        .soft(visibleCells.nth(i).locator('.jp-InputArea'))
        .toBeVisible();
    }

    const filteredCells = page
      .locator('.jp-Cell')
      .filter({ has: page.locator('.jp-Placeholder') });
    await expect.soft(filteredCells).toHaveCount(6);
    for (let i = 0; i < 6; i++) {
      expect
        .soft((await filteredCells.nth(i).getAttribute('data-tags')) ?? '')
        .not.toContain('orange');
    }
  });

  test('should filter on cell type', async ({ page }) => {
    await page.getByRole('tab', { name: 'Property Inspector' }).click();
    await page.getByText('Common Tools').click();
    await page.getByRole('button', { name: 'Filter Cells' }).click();
    await page
      .getByRole('listitem')
      .filter({ hasText: 'markdown' })
      .getByRole('checkbox')
      .click();
    await page.getByRole('button', { name: 'Filter Cell(s)' }).click();

    const visibleCells = page.locator('.jp-MarkdownCell');

    await expect.soft(visibleCells).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect
        .soft(visibleCells.nth(i).locator('.jp-InputArea'))
        .toBeVisible();
    }

    const filteredCells = page
      .locator('.jp-Cell')
      .filter({ has: page.locator('.jp-Placeholder') });
    await expect.soft(filteredCells).toHaveCount(6);
    for (let i = 0; i < 6; i++) {
      await expect
        .soft(filteredCells.nth(0))
        .not.toHaveClass('.jp-MarkdownCell');
    }
  });

  test('should filter on cell type and tag', async ({ page }) => {
    await page.getByRole('tab', { name: 'Property Inspector' }).click();
    await page.getByText('Common Tools').click();
    await page.getByRole('button', { name: 'Filter Cells' }).click();
    await page
      .getByRole('listitem')
      .filter({ hasText: 'code' })
      .getByRole('checkbox')
      .click();
    await page
      .getByRole('listitem')
      .filter({ hasText: 'orange' })
      .getByRole('checkbox')
      .click();
    await page.getByRole('button', { name: 'Filter Cell(s)' }).click();

    const visibleCells = page.locator('.jp-CodeCell[data-tags*="orange"]');

    await expect.soft(visibleCells).toHaveCount(1);
    await expect
      .soft(visibleCells.first().locator('.jp-InputArea'))
      .toBeVisible();

    const filteredCells = page
      .locator('.jp-Cell')
      .filter({ has: page.locator('.jp-Placeholder') });
    await expect.soft(filteredCells).toHaveCount(8);
    for (let i = 0; i < 8; i++) {
      const tags = (await filteredCells.nth(i).getAttribute('data-tags')) ?? '';
      const isCodeCell = await filteredCells
        .nth(i)
        .evaluate(elt => elt.classList.contains('jp-CodeCell'));
      expect.soft(isCodeCell && tags.match('orange') !== null).toEqual(false);
    }
  });

  test('should clear all filters', async ({ page }) => {
    await page.getByRole('tab', { name: 'Property Inspector' }).click();
    await page.getByText('Common Tools').click();
    await page.getByRole('button', { name: 'Filter Cells' }).click();
    await page
      .getByRole('listitem')
      .filter({ hasText: 'code' })
      .getByRole('checkbox')
      .click();
    await page
      .getByRole('listitem')
      .filter({ hasText: 'banana' })
      .getByRole('checkbox')
      .click();
    await page.getByRole('button', { name: 'Filter Cell(s)' }).click();

    await expect.soft(page.locator('.jp-InputArea')).toHaveCount(1);

    await page.getByRole('button', { name: 'Filter Cells' }).click();
    await page.getByRole('button', { name: 'Clear Filter(s)' }).click();

    await expect(page.locator('.jp-InputArea')).toHaveCount(9);
  });
});
