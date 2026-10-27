// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import type { Page } from '@playwright/test';

/**
 * The dock panel freezes panel dimensions during a handle drag, but only for
 * panels holding more than a thousand nodes.
 */
const NODE_THRESHOLD = 1000;

const TRACKER = '@jupyterlab/notebook-extension:tracker';

/**
 * Open a second view of the current notebook and grab the handle between them.
 */
async function splitAndGrabHandle(
  page: Page
): Promise<{ x: number; y: number }> {
  await page.evaluate(async () => {
    await window.jupyterapp.commands.execute('docmanager:clone');
  });
  await expect(
    page.locator('[role="main"] .jp-NotebookPanel:visible')
  ).toHaveCount(2);

  const handle = page.locator(
    '.lm-DockPanel-handle[data-orientation="horizontal"]:visible'
  );
  const box = (await handle.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe('Dock panel resize (cell heavy notebook)', () => {
  const fileName = 'dock_resize_notebook.ipynb';

  // Heavy over all of its cells while every single cell stays under the threshold.
  const cellSource = new Array(20)
    .fill(0)
    .map(
      (_, i) => `variable_${i} = "a line of code long enough to render wide"`
    )
    .join('\n');

  test.beforeEach(async ({ page, tmpPath }) => {
    const notebook = galata.Notebook.generateNotebook(60, 'code', [cellSource]);
    await page.contents.uploadContent(
      JSON.stringify(notebook),
      'text',
      `${tmpPath}/${fileName}`
    );
    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    await page.notebook.activate(fileName);
  });

  test.afterEach(async ({ page, tmpPath }) => {
    await page.contents.deleteDirectory(tmpPath);
  });

  test('should keep notebooks the width of their panel after resizing', async ({
    page
  }) => {
    const panels = page.locator('[role="main"] .jp-NotebookPanel:visible');

    // Guard the assumption the test rests on: without a heavy panel the dock
    // panel freezes nothing and the drag below cannot go wrong. Polled, as
    // the cells render after the notebook is activated.
    await expect
      .poll(async () =>
        page
          .locator('.jp-Notebook')
          .first()
          .evaluate(node => node.querySelectorAll('*').length)
      )
      .toBeGreaterThan(NODE_THRESHOLD);

    const { x, y } = await splitAndGrabHandle(page);
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let step = 1; step <= 8; step++) {
      await page.mouse.move(x + step * 25, y, { steps: 2 });
    }
    await page.mouse.up();

    for (let i = 0; i < 2; i++) {
      const panel = panels.nth(i);
      const panelBox = (await panel.boundingBox())!;
      const notebookBox = (await panel.locator('.jp-Notebook').boundingBox())!;
      expect(Math.abs(notebookBox.width - panelBox.width)).toBeLessThan(10);
    }
  });
});

test.describe('Dock panel resize (output heavy notebook)', () => {
  const fileName = 'dock_resize_outputs.ipynb';

  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      [TRACKER]: {
        ...galata.DEFAULT_SETTINGS[TRACKER],
        maxNumberOutputs: 500
      }
    }
  });

  test.beforeEach(async ({ page, tmpPath }) => {
    // Many modest outputs: the output area is heavy while no single output
    // is, so the freeze lands on a widget node no layout positions.
    const outputs = new Array(400).fill(0).map(() => ({
      output_type: 'display_data' as const,
      data: { 'text/plain': "'qwertyuiopasdfghjklzxcvbnm'" },
      metadata: {}
    }));
    const notebook = galata.Notebook.generateNotebook(
      1,
      'code',
      ['for i in range(400):\n    display("qwertyuiopasdfghjklzxcvbnm")'],
      outputs
    );
    await page.contents.uploadContent(
      JSON.stringify(notebook),
      'text',
      `${tmpPath}/${fileName}`
    );
    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    await page.notebook.activate(fileName);
    await expect(page.locator('.jp-OutputArea-child')).toHaveCount(400);
  });

  test.afterEach(async ({ page, tmpPath }) => {
    await page.contents.deleteDirectory(tmpPath);
  });

  test('should freeze an output heavy panel while the handle moves', async ({
    page
  }) => {
    const { x, y } = await splitAndGrabHandle(page);
    const outputArea = page.locator('.jp-OutputArea').first();
    const before = (await outputArea.boundingBox())!.width;

    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 200, y);

    // Assert the pin rather than a width. The frozen sizes are re-measured
    // 300ms after the last move, so any width read races that deadline.
    await expect
      .poll(async () => outputArea.evaluate(node => node.style.maxWidth))
      .toBeTruthy();

    await page.mouse.up();

    await expect
      .poll(async () => (await outputArea.boundingBox())!.width)
      .toBeGreaterThan(before + 100);
  });
});
