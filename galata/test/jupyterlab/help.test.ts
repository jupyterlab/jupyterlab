/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, test } from '@jupyterlab/galata';
import { readFile } from 'fs/promises';

import { isBlank, isValidJSON } from './utils';

const licenseFormats = [
  {
    name: 'Markdown',
    extension: 'md',
    validation: (value: string) => !isBlank(value)
  },
  {
    name: 'CSV',
    extension: 'csv',
    validation: (value: string) => !isBlank(value)
  },
  { name: 'JSON', extension: 'json', validation: isValidJSON }
];

test('Switch back and forth to reference page', async ({ page }) => {
  // The goal is to test switching back and forth with a tab containing an iframe
  const notebookFilename = 'test-switch-doc-notebook';
  const cellContent = '# First cell';
  await page.notebook.createNew(notebookFilename);

  await page.notebook.setCell(0, 'markdown', cellContent);

  await page.menu.clickMenuItem('Help>Jupyter Reference');

  await expect(
    page
      .frameLocator('iframe[src="https://jupyter.org/documentation"]')
      .locator('h1')
      .first()
  ).toHaveText('Project Jupyter Documentation#');

  await page.activity.activateTab(notebookFilename);

  await page.locator('.jp-MarkdownCell .jp-InputArea-editor').waitFor();

  await expect(
    page.locator('.jp-MarkdownCell .jp-InputArea-editor')
  ).toHaveText(cellContent);
});

test.describe('Licenses', () => {
  licenseFormats.forEach(licenseFormat => {
    test(`Exporting licenses as ${licenseFormat.name} must download a ${licenseFormat.name} file`, async ({
      page
    }) => {
      await page.menu.clickMenuItem('Help>Licenses');

      const downloadPromise = page.waitForEvent('download');
      await page
        .getByRole('button', {
          name: `Download All Licenses as ${licenseFormat.name}`
        })
        .click();
      const download = await downloadPromise;

      const fileName = download.suggestedFilename();
      const fileContent = await readFile(await download.path(), {
        encoding: 'utf8'
      });

      expect(fileName).toBe(`jupyterlab-licenses.${licenseFormat.extension}`);
      expect(licenseFormat.validation(fileContent)).toBeTruthy();
    });
  });
});
