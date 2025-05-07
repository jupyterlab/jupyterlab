/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 * Copyright (c) Bloomberg Finance LP.
 */

import * as path from 'path';

import { expect, galata, test } from '@jupyterlab/galata';

test.describe('Notebook Tests', () => {
  test('Create New Notebook', async ({ page, tmpPath }) => {
    const fileName = 'create_test.ipynb';
    await page.notebook.createNew(fileName);
    await page.getByRole('main').getByText(fileName).waitFor();

    expect(await page.contents.fileExists(`${tmpPath}/${fileName}`)).toEqual(
      true
    );
  });
  test('Create New Notebook with kernel', async ({ page, tmpPath }) => {
    const fileName = 'create_kernel_test.ipynb';
    await page.notebook.createNew(fileName, { kernel: 'python3' });
    await page.getByRole('main').getByText(fileName).waitFor();

    expect(await page.contents.fileExists(`${tmpPath}/${fileName}`)).toEqual(
      true
    );
    const toolbar = page.getByRole('toolbar', { name: 'main area toolbar' });
    await expect(toolbar.getByText('Python 3 (ipykernel)')).toBeVisible();
  });

  test('Create New Notebook with kernel - no kernel', async ({
    page,
    tmpPath
  }) => {
    const fileName = 'create_no_kernel_test.ipynb';
    await page.notebook.createNew(fileName, { kernel: null });
    await page.getByRole('main').getByText(fileName).waitFor();

    expect(await page.contents.fileExists(`${tmpPath}/${fileName}`)).toEqual(
      true
    );
    const toolbar = page.getByRole('toolbar', { name: 'main area toolbar' });
    await expect(toolbar.getByText('No Kernel')).toBeVisible();
  });

  test('Create Markdown cell', async ({ page }) => {
    await page.notebook.createNew();

    await page.notebook.setCell(0, 'markdown', '## This is a markdown cell');
    expect(await page.notebook.getCellCount()).toBe(1);
    expect(await page.notebook.getCellType(0)).toBe('markdown');
    expect(await page.notebook.getCellTextInput(0)).toBe(
      '## This is a markdown cell'
    );

    expect(await page.locator('.jp-Notebook').screenshot()).toMatchSnapshot(
      'markdown-cell.png'
    );
  });

  test('Create Raw cell', async ({ page }) => {
    await page.notebook.createNew();

    await page.notebook.addCell('raw', 'This is a raw cell');
    expect(await page.notebook.getCellCount()).toBe(2);
    expect(await page.notebook.getCellType(1)).toBe('raw');
    expect(await page.notebook.getCellTextInput(1)).toBe('This is a raw cell');

    expect(await page.locator('.jp-Notebook').screenshot()).toMatchSnapshot(
      'raw-cell.png'
    );
  });

  test('Create Code cell', async ({ page }) => {
    await page.notebook.createNew();

    await page.notebook.addCell('code', '2 + 2');
    expect(await page.notebook.getCellCount()).toBe(2);
    expect(await page.notebook.getCellType(1)).toBe('code');
    expect(await page.notebook.getCellTextInput(1)).toBe('2 + 2');

    expect(await page.locator('.jp-Notebook').screenshot()).toMatchSnapshot(
      'code-cell.png'
    );
  });

  test('Should copy cell input content with new lines', async ({ page }) => {
    await page.notebook.createNew();

    await page.notebook.setCell(0, 'code', 'a\nb\nc');
    expect(await page.notebook.getCellTextInput(0)).toBe('a\nb\nc');
  });

  test('Run Cells', async ({ page }) => {
    await page.notebook.createNew();

    await page.notebook.setCell(0, 'markdown', '## This is a markdown cell');
    await page.notebook.addCell('raw', 'This is a raw cell');
    await page.notebook.addCell('code', '2 + 2');

    await page.notebook.run();

    expect((await page.notebook.getCellTextOutput(2))![0]).toBe('4');

    expect(await page.locator('.jp-Notebook').screenshot()).toMatchSnapshot(
      'run-cells.png'
    );
  });

  test('Save', async ({ page }) => {
    await page.notebook.createNew();

    await page.notebook.setCell(0, 'markdown', '## This is a markdown cell');

    const tabList = page.getByRole('main').getByRole('tablist');
    const notSavedIndicator = tabList.locator('.jp-mod-dirty');
    await expect(notSavedIndicator).toHaveCount(1);

    await page.notebook.save();
    await expect(notSavedIndicator).toHaveCount(0);

    expect(await tabList.screenshot()).toMatchSnapshot(
      'notebook-tab-saved.png'
    );
  });

  test('Open and run cell by cell', async ({ page, tmpPath }) => {
    await page.contents.uploadDirectory(
      path.resolve(__dirname, './notebooks'),
      tmpPath
    );

    await page.filebrowser.openDirectory(tmpPath);
    const notebook = 'example.ipynb';
    await page.notebook.open(notebook);
    expect(await page.notebook.isOpen(notebook)).toBeTruthy();
    await page.notebook.activate(notebook);
    expect(await page.notebook.isActive(notebook)).toBeTruthy();

    await page.locator('#jp-main-statusbar').getByText('Idle').waitFor();

    await page.notebook.runCellByCell();

    const cellOutput2 = await page.notebook.getCellTextOutput(2);
    expect(cellOutput2).toBeTruthy();
    expect(parseInt(cellOutput2![0])).toBe(4);

    const cellOutput4 = await page.notebook.getCellTextOutput(4);
    expect(cellOutput4).toBeTruthy();
    expect(parseFloat(cellOutput4![0])).toBeGreaterThan(1.5);

    const panel = await page.activity.getPanelLocator();

    // Note: this should be the only test taking the screenshot
    // of the full panel; all other tests should take snapshots
    // of individual notebook parts to avoid the need to review
    // multiple snapshots when some minor change is introduced
    // in the UI (e.g. in the toolbar).
    expect(await panel!.screenshot()).toMatchSnapshot('example-run.png');
  });

  test('Open folder of notebook and run', async ({ page, tmpPath }) => {
    const filename = 'simple_test.ipynb';
    await page.contents.uploadFile(
      path.resolve(__dirname, 'notebooks', filename),
      `${tmpPath}/${filename}`
    );

    await page.notebook.openByPath(`${tmpPath}/${filename}`);

    await page.locator('#jp-main-statusbar').getByText('Idle').waitFor();

    await page.notebook.runCellByCell();

    expect(await page.getByText('100').count()).toBeGreaterThanOrEqual(1);

    await page.notebook.revertChanges();
    await page.notebook.close();

    await expect(page.launcher).toBeVisible();
  });
});

test.describe('Access cells in windowed notebook', () => {
  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/notebook-extension:tracker': {
        ...galata.DEFAULT_SETTINGS['@jupyterlab/notebook-extension:tracker'],
        windowingMode: 'full'
      }
    }
  });

  test('get the cell count', async ({ page, tmpPath }) => {
    const target = `${tmpPath}/windowed_notebook.ipynb`;
    await page.contents.uploadFile(
      path.resolve(__dirname, 'notebooks/windowed_notebook.ipynb'),
      target
    );

    await page.filebrowser.open(target);
    await page.locator('#jp-main-statusbar').getByText('Idle').waitFor();

    expect(await page.notebook.getCellCount()).toEqual(19);
  });

  test('getCell below the viewport', async ({ page, tmpPath }) => {
    const target = `${tmpPath}/windowed_notebook.ipynb`;
    await page.contents.uploadFile(
      path.resolve(__dirname, 'notebooks/windowed_notebook.ipynb'),
      target
    );

    await page.filebrowser.open(target);
    await page.locator('#jp-main-statusbar').getByText('Idle').waitFor();

    expect(await page.notebook.getCellLocator(12)).toBeTruthy();
  });

  test('getCell above the viewport', async ({ page, tmpPath }) => {
    const target = `${tmpPath}/windowed_notebook.ipynb`;
    await page.contents.uploadFile(
      path.resolve(__dirname, 'notebooks/windowed_notebook.ipynb'),
      target
    );

    await page.filebrowser.open(target);
    await page.locator('#jp-main-statusbar').getByText('Idle').waitFor();
    await page.waitForTimeout(50);

    await page.notebook.getCellLocator(12);

    expect(await page.notebook.getCellLocator(0)).toBeTruthy();
  });
});
