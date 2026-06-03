// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import * as path from 'path';

const fileName = '200_empty_cells.ipynb';

const windowingModes = ['defer', 'contentVisibility'] as const;

for (const mode of windowingModes) {
  test.describe(`Notebook deferred loading (${mode} mode)`, () => {
    test.use({
      mockSettings: {
        ...galata.DEFAULT_SETTINGS,
        '@jupyterlab/notebook-extension:tracker': {
          ...galata.DEFAULT_SETTINGS['@jupyterlab/notebook-extension:tracker'],
          windowingMode: mode
        }
      }
    });

    test.beforeEach(async ({ page, tmpPath }) => {
      await page.contents.uploadFile(
        path.resolve(__dirname, `./notebooks/${fileName}`),
        `${tmpPath}/${fileName}`
      );

      await page.notebook.openByPath(`${tmpPath}/${fileName}`);
      await page.notebook.activate(fileName);
    });

    test.afterEach(async ({ page, tmpPath }) => {
      await page.contents.deleteDirectory(tmpPath);
    });

    test('should render cells in batches after opening', async ({ page }) => {
      // Ensure the first cell is present (initial render complete)
      const firstCell = await page.notebook.getCellLocator(0);
      await firstCell!.waitFor({ state: 'visible', timeout: 3000 });

      // Sample the number of rendered cells until at least 200 are rendered.
      const counts: number[] = [];
      const locator = page.locator('.jp-Cell');
      let current: number;

      do {
        // Small delay to allow next batch of cells to render
        await page.waitForTimeout(100);
        current = await locator.count();
        counts.push(current);
      } while (current < 200);

      // There should be at least one increase in the sequence of counts
      let increased = false;
      for (let i = 1; i < counts.length; i++) {
        if (counts[i] > counts[i - 1]) {
          increased = true;
          break;
        }
      }

      expect(increased).toBe(true);
    });

    test('should scroll to a cell that is not yet rendered', async ({
      page
    }) => {
      // Ensure the notebook is attached (initial render complete).
      const firstCell = await page.notebook.getCellLocator(0);
      await firstCell!.waitFor({ state: 'visible', timeout: 3000 });

      const lastCellIndex = 199;
      const lastCell = page.locator(
        `.jp-Cell[data-windowed-list-index="${lastCellIndex}"]`
      );

      // Request a scroll to the last cell while it is (very likely) still a
      // placeholder being rendered progressively during idle time.
      await page.evaluate(async index => {
        const panel = window.jupyterapp.shell.currentWidget as any;
        const notebook = panel.content;
        const cell = notebook.widgets[index];
        await notebook.scrollToCell(cell);
      }, lastCellIndex);

      // The last cell should eventually be scrolled into the viewport.
      await expect(lastCell).toBeInViewport();
    });
  });
}
