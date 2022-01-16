// Copyright (c) Jupyter Development Team.
// Copyright (c) Bloomberg Finance LP.
// Distributed under the terms of the Modified BSD License.

import * as path from 'path';

import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';

test.describe('Notebook Tests', () => {
  test('Create New Notebook', async ({ page, tmpPath }) => {
    const fileName = 'create_test.ipynb';
    await page.notebook.createNew(fileName);
    expect(
      await page.waitForSelector(`[role="main"] >> text=${fileName}`)
    ).toBeTruthy();

    expect(await page.contents.fileExists(`${tmpPath}/${fileName}`)).toEqual(
      true
    );
  });

  test('Create Markdown cell', async ({ page }) => {
    await page.notebook.createNew();

    await page.notebook.setCell(0, 'markdown', '## This is a markdown cell');
    expect(await page.notebook.getCellCount()).toBe(1);
    expect(await page.notebook.getCellType(0)).toBe('markdown');

    // Wait for kernel to be idle
    expect(
      await page.waitForSelector(`#jp-main-statusbar >> text=Idle`)
    ).toBeTruthy();

    expect(await (await page.$('[role="main"]')).screenshot()).toMatchSnapshot(
      'markdown-cell.png'
    );
  });

  test('Create Raw cell', async ({ page }) => {
    await page.notebook.createNew();

    await page.notebook.addCell('raw', 'This is a raw cell');
    expect(await page.notebook.getCellCount()).toBe(2);
    expect(await page.notebook.getCellType(1)).toBe('raw');

    // Wait for kernel to be idle and the debug switch to appear
    await Promise.all([
      page.waitForSelector(`#jp-main-statusbar >> text=Idle`),
      page.waitForSelector('.jp-DebuggerBugButton')
    ]);

    expect(await (await page.$('[role="main"]')).screenshot()).toMatchSnapshot(
      'raw-cell.png'
    );
  });

  test('Create Code cell', async ({ page }) => {
    await page.notebook.createNew();

    await page.notebook.addCell('code', '2 + 2');
    expect(await page.notebook.getCellCount()).toBe(2);
    expect(await page.notebook.getCellType(1)).toBe('code');

    // Wait for kernel to be idle
    expect(
      await page.waitForSelector(`#jp-main-statusbar >> text=Idle`)
    ).toBeTruthy();

    expect(await (await page.$('[role="main"]')).screenshot()).toMatchSnapshot(
      'code-cell.png'
    );
  });

  test('Run Cells', async ({ page }) => {
    await page.notebook.createNew();

    await page.notebook.setCell(0, 'markdown', '## This is a markdown cell');
    await page.notebook.addCell('raw', 'This is a raw cell');
    await page.notebook.addCell('code', '2 + 2');

    await page.notebook.run();
    await page.notebook.save();

    expect((await page.notebook.getCellTextOutput(2))![0]).toBe('4');

    expect(await (await page.$('[role="main"]')).screenshot()).toMatchSnapshot(
      'run-cells.png'
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

    await page.notebook.runCellByCell();

    const cellOutput2 = await page.notebook.getCellTextOutput(2);
    expect(cellOutput2).toBeTruthy();
    expect(parseInt(cellOutput2![0])).toBe(4);

    const cellOutput4 = await page.notebook.getCellTextOutput(4);
    expect(cellOutput4).toBeTruthy();
    expect(parseFloat(cellOutput4![0])).toBeGreaterThan(1.5);

    const panel = await page.activity.getPanel();

    expect(await panel.screenshot()).toMatchSnapshot('example-run.png');
  });

  test('Open folder of notebook and run', async ({ page, tmpPath }) => {
    const filename = 'simple_test.ipynb';
    await page.contents.uploadFile(
      path.resolve(__dirname, 'notebooks', filename),
      `${tmpPath}/${filename}`
    );

    await page.notebook.openByPath(`${tmpPath}/${filename}`);
    await page.notebook.runCellByCell();

    expect(await page.waitForSelector('text=100')).toBeTruthy();

    await page.notebook.revertChanges();
    await page.notebook.close();

    expect(await page.waitForSelector(page.launcherSelector)).toBeTruthy();
  });
});
