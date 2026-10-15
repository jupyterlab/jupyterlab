// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

test.describe('Saving cell metadata', () => {
  const notebookName = 'cell-metadata.ipynb';
  const editorSelector = '.jp-CellMetadataEditor .cm-content';
  const commitSelector =
    '.jp-CellMetadataEditor [title="Commit changes to data"]';

  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(notebookName, { kernel: null });
    await page.sidebar.openTab('jp-property-inspector');
    await page.getByText('Advanced Tools', { exact: true }).click();
    await expect(page.locator(editorSelector)).toBeVisible();
  });

  for (const save of ['shortcut', 'command']) {
    test(`should save pending cell metadata using the ${save}`, async ({
      page,
      baseURL,
      tmpPath
    }) => {
      const editor = page.locator(editorSelector);
      const metadata = { custom: { value: 6163 }, tags: ['saved'] };
      await editor.fill(JSON.stringify(metadata));
      await expect(page.locator(commitSelector)).toBeVisible();

      const saved = page.waitForResponse(
        response =>
          response.url().includes(`/api/contents/${tmpPath}/${notebookName}`) &&
          response.request().method() === 'PUT'
      );
      if (save === 'shortcut') {
        await editor.press('ControlOrMeta+s');
      } else {
        await page.evaluate(async () => {
          await window.jupyterapp.commands.execute('docmanager:save');
        });
      }
      await saved;

      const response = await page.request.get(
        `${baseURL}/api/contents/${tmpPath}/${notebookName}`
      );
      expect(response.ok()).toBe(true);
      expect((await response.json()).content.cells[0].metadata).toMatchObject(
        metadata
      );
      await expect(page.locator(commitSelector)).toBeHidden();
    });
  }

  test('should preserve invalid cell metadata when saving', async ({
    page,
    baseURL,
    tmpPath
  }) => {
    const editor = page.locator(editorSelector);
    await editor.fill('{"saved": true}');
    await page.locator(commitSelector).click();
    await editor.fill('{"saved":');

    await page.evaluate(async () => {
      await window.jupyterapp.commands.execute('docmanager:save');
    });

    const response = await page.request.get(
      `${baseURL}/api/contents/${tmpPath}/${notebookName}`
    );
    expect(response.ok()).toBe(true);
    expect((await response.json()).content.cells[0].metadata).toMatchObject({
      saved: true
    });
    await expect(editor).toHaveText('{"saved":');
    await expect(
      page.locator('.jp-CellMetadataEditor .jp-JSONEditor')
    ).toHaveClass(/jp-mod-error/);
  });

  test('should commit only when the edited notebook is saved', async ({
    page,
    baseURL,
    tmpPath
  }) => {
    const otherNotebook = 'other.ipynb';
    await page.notebook.createNew(otherNotebook, { kernel: null });
    await page.activity.activateTab(notebookName);
    const editor = page.locator(editorSelector);
    await editor.fill('{"pending": true}');
    await expect(page.locator(commitSelector)).toBeVisible();

    const savedOtherNotebook = await page.evaluate(async name => {
      const manager = await window.galata.getPlugin(
        '@jupyterlab/docmanager-extension:manager'
      );
      if (!manager) {
        throw new Error('Document manager is unavailable.');
      }
      for (const widget of window.jupyterapp.shell.widgets('main')) {
        const context = manager.contextForWidget(widget);
        if (context?.path.endsWith(`/${name}`)) {
          await context.save();
          return true;
        }
      }
      return false;
    }, otherNotebook);

    expect(savedOtherNotebook).toBe(true);
    await expect(page.locator(commitSelector)).toBeVisible();
    await expect(editor).toHaveText('{"pending": true}');
    const otherResponse = await page.request.get(
      `${baseURL}/api/contents/${tmpPath}/${otherNotebook}`
    );
    expect(otherResponse.ok()).toBe(true);
    expect(
      (await otherResponse.json()).content.cells[0].metadata
    ).not.toHaveProperty('pending');

    await page.evaluate(async () => {
      await window.jupyterapp.commands.execute('docmanager:save');
    });

    const response = await page.request.get(
      `${baseURL}/api/contents/${tmpPath}/${notebookName}`
    );
    expect(response.ok()).toBe(true);
    expect((await response.json()).content.cells[0].metadata).toMatchObject({
      pending: true
    });
    await expect(page.locator(commitSelector)).toBeHidden();
  });
});
