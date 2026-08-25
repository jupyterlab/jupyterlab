// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';
import type { ICellModel } from '@jupyterlab/cells';
import type { NotebookPanel } from '@jupyterlab/notebook';

const fileName = 'trust.ipynb';
const TRUST_ITEM_SELECTOR = '.jp-StatusItem-trust';
const TRUSTED_SELECTOR = 'svg[data-icon="ui-components:trusted"]';
const NOT_TRUSTED_SELECTOR = 'svg[data-icon="ui-components:not-trusted"]';

test.describe('Notebook Trust', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(fileName);
  });

  test('Blank Markdown cell does not break trust', async ({ page }) => {
    // See https://github.com/jupyterlab/jupyterlab/issues/9765

    // Add an empty Markdown cell
    await page.notebook.addCell('markdown', '');
    // The notebook should be trusted
    await expect(page.locator(TRUSTED_SELECTOR)).toHaveCount(1);
    await page.notebook.save();
    // Reload page
    await page.reload({ waitForIsReady: false });
    // Should still be trusted
    await expect(page.locator(TRUSTED_SELECTOR)).toHaveCount(1);
  });

  test('Trust is lost after manually editing notebook', async ({
    page,
    browserName
  }) => {
    const browserContext = page.context();
    if (browserName !== 'firefox') {
      // Firefox does not support clipboard-read but does not it it either
      await browserContext.grantPermissions(['clipboard-read']);
    }
    // Add text to first cell
    await page.notebook.setCell(0, 'code', 'TEST_TEXT');
    await page.notebook.save();
    // The notebook should be trusted
    await expect(page.locator(TRUSTED_SELECTOR)).toHaveCount(1);
    await expect(page.locator(NOT_TRUSTED_SELECTOR)).toHaveCount(0);

    // Open notebook in text editor using context menu
    await page.click(`.jp-DirListing-item span:has-text("${fileName}")`, {
      button: 'right'
    });
    await page.hover('text=Open With');
    await page.click('.lm-Menu li[role="menuitem"]:has-text("Editor")');
    const editorContent = page.locator('.jp-FileEditor .cm-content');
    await editorContent.waitFor();
    await editorContent.locator('text=TEST_TEXT').waitFor();
    const originalContent = await page.evaluate(async () => {
      await window.jupyterapp.commands.execute('fileeditor:select-all');
      await window.jupyterapp.commands.execute('fileeditor:cut');
      return navigator.clipboard.readText();
    });
    const newContent = originalContent.replace('TEST_TEXT', 'SUBSTITUTED_TEXT');
    await page.evaluate(
      async ([newContent]) => {
        await window.jupyterapp.commands.execute(
          'fileeditor:replace-selection',
          { text: newContent }
        );
        // Save file after changes
        await window.jupyterapp.commands.execute('docmanager:save');
        // Close the file editor view of the notebook
        await window.jupyterapp.commands.execute('application:close');
      },
      [newContent]
    );

    // Reload page
    await page.reload({ waitForIsReady: false });

    // It should no longer be trusted
    await expect(page.locator(TRUSTED_SELECTOR)).toHaveCount(0);
    await expect(page.locator(NOT_TRUSTED_SELECTOR)).toHaveCount(1);
  });

  test('Trust status does not rescan trust state on source edits', async ({
    page
  }) => {
    const trustItem = page.locator(TRUST_ITEM_SELECTOR);

    await page.evaluate(() => {
      const panel = window.jupyterapp.shell
        .currentWidget as unknown as NotebookPanel;
      const model = panel.content.model;
      if (!model) {
        throw new Error('Notebook model not found');
      }

      model.sharedModel.insertCell(1, {
        cell_type: 'code',
        metadata: { trusted: true },
        source: '1'
      });
      model.sharedModel.insertCell(2, {
        cell_type: 'code',
        metadata: { trusted: true },
        source: '2'
      });
      model.cells.get(2).trusted = false;
    });

    await expect(trustItem).toHaveAttribute(
      'title',
      /2 of 3 code cells trusted\./
    );

    const trustedReads = await page.evaluate(() => {
      const panel = window.jupyterapp.shell
        .currentWidget as unknown as NotebookPanel;
      const model = panel.content.model;
      if (!model) {
        throw new Error('Notebook model not found');
      }
      const cell = model.cells.get(0);
      let prototype = Object.getPrototypeOf(cell);
      let descriptor: PropertyDescriptor | undefined;
      let reads = 0;

      while (prototype && !descriptor) {
        descriptor = Object.getOwnPropertyDescriptor(prototype, 'trusted');
        prototype = Object.getPrototypeOf(prototype);
      }
      if (!descriptor) {
        throw new Error('Could not find trusted descriptor');
      }

      Object.defineProperty(cell as ICellModel, 'trusted', {
        configurable: true,
        get: function () {
          reads++;
          return descriptor.get!.call(this);
        },
        set: function (value: boolean) {
          descriptor.set!.call(this, value);
        }
      });
      try {
        cell.sharedModel.setSource('print("changed")');
      } finally {
        Object.defineProperty(cell as ICellModel, 'trusted', descriptor);
      }

      return reads;
    });

    expect(trustedReads).toBe(0);
    await expect(trustItem).toHaveAttribute(
      'title',
      /2 of 3 code cells trusted\./
    );
  });

  test('Trust status refreshes the active non-code cell trust state', async ({
    page
  }) => {
    const trustItem = page.locator(TRUST_ITEM_SELECTOR);

    await expect(trustItem).toHaveAttribute(
      'title',
      /Notebook trusted: 1 of 1 code cells trusted\./
    );

    await page.evaluate(() => {
      const panel = window.jupyterapp.shell
        .currentWidget as unknown as NotebookPanel;
      const model = panel.content.model;
      if (!model) {
        throw new Error('Notebook model not found');
      }

      const codeCell = model.cells.get(0);
      codeCell.trusted = true;
      model.sharedModel.insertCell(1, {
        cell_type: 'markdown',
        metadata: {},
        source: 'Active markdown'
      });

      const markdownCell = model.cells.get(1);
      markdownCell.trusted = false;
      panel.content.activeCellIndex = 1;
      markdownCell.trusted = true;
      codeCell.trusted = false;
    });

    await expect(trustItem).toHaveAttribute(
      'title',
      /Active cell trusted: 0 of 1 code cells trusted\./
    );
  });
});
