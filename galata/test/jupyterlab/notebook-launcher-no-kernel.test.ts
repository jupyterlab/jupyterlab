// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';
import type { NotebookPanel } from '@jupyterlab/notebook';

test.use({ autoGoto: false });

for (const emptySpecs of [true, false]) {
  test.describe(`Notebook launcher with ${emptySpecs ? 'no' : 'installed'} kernels`, () => {
    test.beforeEach(async ({ page, tmpPath }) => {
      if (emptySpecs) {
        await page.route('**/api/kernelspecs', route =>
          route.fulfill({ json: { default: '', kernelspecs: {} } })
        );
      }
      await page.goto();
      await page.filebrowser.openDirectory(tmpPath);
    });

    test('creates a notebook with the selected language and no kernel', async ({
      page,
      sessions,
      tmpPath
    }) => {
      const tile = page
        .locator('.jp-LauncherCard[data-category="Notebook"]')
        .filter({ has: page.getByText('Notebook', { exact: true }) });
      await expect(tile).toBeVisible();
      const startedSessions: string[] = [];
      page.on('request', request => {
        if (
          request.method() === 'POST' &&
          request.url().endsWith('/api/sessions')
        ) {
          startedSessions.push(request.url());
        }
      });
      await tile.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toContainText('Select Notebook Language');
      await dialog.getByRole('combobox').selectOption({ label: 'Julia' });
      await dialog.getByRole('button', { name: 'Create', exact: true }).click();

      await expect(page.getByTitle('Switch kernel')).toHaveText('No Kernel');
      await expect(page.locator('.jp-NotebookPanel')).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(() => {
            const panel = window.jupyterapp.shell
              .currentWidget as NotebookPanel;
            return panel.content.activeCell?.model.mimeType;
          })
        )
        .toBe('text/x-julia');
      await page.notebook.save();
      const response = await page.request.get(
        `api/contents/${tmpPath}/Untitled.ipynb`
      );
      expect(response.ok()).toBe(true);
      const notebook = await response.json();
      expect(notebook.content.metadata.language_info.name).toBe('Julia');
      expect(sessions?.size).toBe(0);
      expect(startedSessions).toEqual([]);
    });

    test('canceling language selection does not create a notebook', async ({
      page,
      tmpPath
    }) => {
      const before = await page.contents.getContentMetadata(
        tmpPath,
        'directory'
      );
      await page
        .locator('.jp-LauncherCard[data-category="Notebook"]')
        .filter({ has: page.getByText('Notebook', { exact: true }) })
        .click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Cancel' })
        .click();
      await expect(page.getByRole('dialog')).toBeHidden();
      const after = await page.contents.getContentMetadata(
        tmpPath,
        'directory'
      );
      expect(after?.content).toEqual(before?.content);
      await expect(page.locator('.jp-NotebookPanel')).toHaveCount(0);
    });

    if (emptySpecs) {
      test('shows the Notebook section without kernels', async ({ page }) => {
        const section = page.locator('.jp-Launcher-section').filter({
          has: page.locator('.jp-LauncherCard[data-category="Notebook"]')
        });
        await expect(section).toBeVisible();
        expect(await section.screenshot()).toMatchSnapshot(
          'notebook-no-kernel.png'
        );
      });
    }
  });
}
