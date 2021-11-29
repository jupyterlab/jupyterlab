// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IJupyterLabPageFixture, test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';

const fileName = 'notebook.ipynb';

// const menuPaths = ['File', 'Edit', 'View', 'Run', 'Kernel', 'Help'];

async function populateNotebook(page: IJupyterLabPageFixture) {
  await page.notebook.setCell(0, 'markdown', '# Heading 1');
  await page.notebook.addCell('code', '1+1');
  await page.notebook.addCell('code', '2+2');
}

test.describe('Collapsible Headings; showHCB', () => {
  // create an empty notebook for each test
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(fileName);
  });

  test('Show Collapser Unselected; showHCB', async ({ page }) => {
    await populateNotebook(page);
    await page.notebook.run();
    expect(await (await page.notebook.getCell(0)).screenshot()).toMatchSnapshot(
      'showHCB_heading_unselected.png'
    );
  });

  test('Show Collapser Selected; showHCB', async ({ page }) => {
    await populateNotebook(page);
    await page.notebook.run();
    await page.notebook.selectCells(0);
    expect(await (await page.notebook.getCell(0)).screenshot()).toMatchSnapshot(
      'showHCB_heading_selected.png'
    );
  });

  test('Collapse Heading; showHCB', async ({ page }) => {
    await populateNotebook(page);
    await page.notebook.run();
    await page.notebook.selectCells(0);
    await page.click('text=xxxxxxxxxx # Heading 1Heading 1¶ >> button');
    expect(
      await (await page.notebook.getNotebookInPanel()).screenshot()
    ).toMatchSnapshot('showHCB_collapse_heading.png');
  });

  test('Expand Heading via Collapser Button; showHCB', async ({ page }) => {
    await populateNotebook(page);
    await page.notebook.run();
    await page.notebook.selectCells(0);
    await page.click('text=xxxxxxxxxx # Heading 1Heading 1¶ >> button');
    await page.click('text=xxxxxxxxxx # Heading 1Heading 1¶ >> button');
    expect(
      await (await page.notebook.getNotebookInPanel()).screenshot()
    ).toMatchSnapshot('showHCB_expand_heading_via_collapser.png');
  });
});

test.describe('Collapsible Headings; no_showHCB', () => {
  // create an empty notebook for each test
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(fileName);
  });
  // use non-standard showHiddenCellsButton=false
  test.use({
    mockSettings: {
      '@jupyterlab/notebook-extension:tracker': {
        showHiddenCellsButton: false
      }
    }
  });

  test('Show Collapser Unselected; no_showHCB', async ({ page }) => {
    await populateNotebook(page);
    await page.notebook.run();
    expect(await (await page.notebook.getCell(0)).screenshot()).toMatchSnapshot(
      'no_showHCB_heading_unselected.png'
    );
  });

  test('Show Collapser Selected; no_showHCB', async ({ page }) => {
    await populateNotebook(page);
    await page.notebook.run();
    await page.notebook.selectCells(0);
    expect(await (await page.notebook.getCell(0)).screenshot()).toMatchSnapshot(
      'no_showHCB_heading_selected.png'
    );
  });

  test('Collapse Heading; no_showHCB', async ({ page }) => {
    await populateNotebook(page);
    await page.notebook.run();
    await page.notebook.selectCells(0);
    await page.click('text=xxxxxxxxxx # Heading 1Heading 1¶ >> button');
    expect(
      await (await page.notebook.getNotebookInPanel()).screenshot()
    ).toMatchSnapshot('no_showHCB_collapse_heading.png');
  });

  test('Expand Heading via Collapser Button; no_showHCB', async ({ page }) => {
    await populateNotebook(page);
    await page.notebook.run();
    await page.notebook.selectCells(0);
    await page.click('text=xxxxxxxxxx # Heading 1Heading 1¶ >> button');
    await page.click('text=xxxxxxxxxx # Heading 1Heading 1¶ >> button');
    expect(
      await (await page.notebook.getNotebookInPanel()).screenshot()
    ).toMatchSnapshot('no_showHCB_expand_heading_via_collapser.png');
  });
});
