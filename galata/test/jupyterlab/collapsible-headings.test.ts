// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect,
  galata,
  IJupyterLabPageFixture,
  test
} from '@jupyterlab/galata';

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
    await populateNotebook(page);
    await page.notebook.run();
  });

  test('Show Collapser Unselected; showHCB', async ({ page }) => {
    expect(await (await page.notebook.getCell(0)).screenshot()).toMatchSnapshot(
      'showHCB_heading_unselected.png'
    );
  });

  test('Show Collapser Selected; showHCB', async ({ page }) => {
    await page.notebook.selectCells(0);
    expect(await (await page.notebook.getCell(0)).screenshot()).toMatchSnapshot(
      'showHCB_heading_selected.png'
    );
  });

  test('Collapse Heading; showHCB', async ({ page }) => {
    await page.notebook.selectCells(0);
    await page.click('text=# Heading 1Heading 1¶ >> button');
    expect(
      await (await page.notebook.getNotebookInPanel()).screenshot()
    ).toMatchSnapshot('showHCB_collapse_heading.png');
  });

  test('Expand Heading via Collapser Button; showHCB', async ({ page }) => {
    await page.notebook.selectCells(0);
    await page.click('text=# Heading 1Heading 1¶ >> button');
    await page.click('text=# Heading 1Heading 1¶ >> button');
    expect(
      await (await page.notebook.getNotebookInPanel()).screenshot()
    ).toMatchSnapshot('showHCB_expand_heading_via_collapser.png');
  });
});

test.describe('Collapsible Headings; no_showHCB', () => {
  // create an empty notebook for each test
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(fileName);
    await populateNotebook(page);
    await page.notebook.run();
  });
  // use non-standard showHiddenCellsButton=false
  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/notebook-extension:tracker': {
        ...galata.DEFAULT_SETTINGS['@jupyterlab/notebook-extension:tracker'],
        showHiddenCellsButton: false
      }
    }
  });

  test('Show Collapser Unselected; no_showHCB', async ({ page }) => {
    expect(await (await page.notebook.getCell(0)).screenshot()).toMatchSnapshot(
      'no_showHCB_heading_unselected.png'
    );
  });

  test('Show Collapser Selected; no_showHCB', async ({ page }) => {
    await page.notebook.selectCells(0);
    expect(await (await page.notebook.getCell(0)).screenshot()).toMatchSnapshot(
      'no_showHCB_heading_selected.png'
    );
  });

  test('Collapse Heading; no_showHCB', async ({ page }) => {
    await page.notebook.selectCells(0);
    await page.click('text=# Heading 1Heading 1¶ >> button');
    expect(
      await (await page.notebook.getNotebookInPanel()).screenshot()
    ).toMatchSnapshot('no_showHCB_collapse_heading.png');
  });

  test('Expand Heading via Collapser Button; no_showHCB', async ({ page }) => {
    await page.notebook.selectCells(0);
    await page.click('text=# Heading 1Heading 1¶ >> button');
    await page.click('text=# Heading 1Heading 1¶ >> button');
    expect(
      await (await page.notebook.getNotebookInPanel()).screenshot()
    ).toMatchSnapshot('no_showHCB_expand_heading_via_collapser.png');
  });
});

async function populateNotebook2(page: IJupyterLabPageFixture) {
  await page.notebook.setCell(0, 'markdown', '# Heading 1');
  await page.notebook.addCell('code', '1+1');
  await page.notebook.addCell('markdown', '## Heading 1.1');
  await page.notebook.addCell('code', '2+2');
  await page.notebook.addCell('markdown', '# Heading 2');
  await page.notebook.addCell('code', '3+3');
  await page.notebook.addCell('code', '4+4');
}

test.describe('Collapsible Headings; keyboard navigation', () => {
  // create an empty notebook for each test
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(fileName);
    await populateNotebook2(page);
    await page.notebook.run();
  });

  test('Jump to Previous Header', async ({ page }) => {
    await page.notebook.selectCells(6);
    await page.keyboard.press('ArrowLeft');
    expect(
      await (await page.notebook.getNotebookInPanel()).screenshot()
    ).toMatchSnapshot('jump_previous_header.png');
  });

  test('Collapse Previous Header', async ({ page }) => {
    await page.notebook.selectCells(6);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    expect(
      await (await page.notebook.getNotebookInPanel()).screenshot()
    ).toMatchSnapshot('collapse_previous_header.png');
  });

  test('Collapse Previous Headers', async ({ page }) => {
    await page.notebook.selectCells(6);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    expect(
      await (await page.notebook.getNotebookInPanel()).screenshot()
    ).toMatchSnapshot('collapse_previous_headers.png');
  });

  test('ReExpand Headers 01', async ({ page }) => {
    await page.notebook.selectCells(6);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('a');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    expect(
      await (await page.notebook.getNotebookInPanel()).screenshot()
    ).toMatchSnapshot('reexpand_headers_01.png');
  });

  test('ReExpand Headers 02', async ({ page }) => {
    await page.notebook.selectCells(6);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    expect(
      await (await page.notebook.getNotebookInPanel()).screenshot()
    ).toMatchSnapshot('reexpand_headers_02.png');
  });

  test('ReExpand Headers 03', async ({ page }) => {
    await page.notebook.selectCells(6);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    expect(
      await (await page.notebook.getNotebookInPanel()).screenshot()
    ).toMatchSnapshot('reexpand_headers_03a.png');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    expect(
      await (await page.notebook.getNotebookInPanel()).screenshot()
    ).toMatchSnapshot('reexpand_headers_03b.png');
  });

  test('Add Header Below 01', async ({ page }) => {
    await page.notebook.selectCells(6);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Shift+B');
    await page.waitForTimeout(200);
    await page.keyboard.type('Heading 3');
    await page.keyboard.press('Shift+Enter');
    await page.notebook.selectCells(2);
    expect(
      await (await page.notebook.getNotebookInPanel()).screenshot()
    ).toMatchSnapshot('add_header_below_01.png');
  });

  /** Check that header below adds header at end of present-level section. */
  test('Add Header Below 02', async ({ page }) => {
    await page.notebook.selectCells(6);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Shift+B');
    await page.waitForTimeout(200);
    await page.keyboard.type('Heading 3');
    await page.keyboard.press('Shift+Enter');
    await page.notebook.selectCells(0);
    expect(
      await (await page.notebook.getNotebookInPanel()).screenshot()
    ).toMatchSnapshot('add_header_below_02.png');
  });

  test('Add Header Below 03', async ({ page }) => {
    await page.notebook.selectCells(6);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Shift+B');
    await page.waitForTimeout(200);
    await page.keyboard.type('Heading 1.2');
    await page.keyboard.press('Shift+Enter');
    await page.notebook.selectCells(2);
    expect(
      await (await page.notebook.getNotebookInPanel()).screenshot()
    ).toMatchSnapshot('add_header_below_03.png');
  });

  /** Checks also if the cursor is at the right position when adding heading */
  test('Add Header Above 01', async ({ page }) => {
    await page.notebook.selectCells(6);
    await page.keyboard.press('Shift+A');
    await page.waitForTimeout(200);
    expect(
      await (await page.notebook.getNotebookInPanel()).screenshot()
    ).toMatchSnapshot('add_header_above_01.png');
  });

  /** Checks also if the cursor is at the right position when adding heading */
  test('Add Header Above 02', async ({ page }) => {
    await page.notebook.selectCells(4);
    await page.keyboard.press('Shift+A');
    await page.waitForTimeout(200);
    expect(
      await (await page.notebook.getNotebookInPanel()).screenshot()
    ).toMatchSnapshot('add_header_above_02.png');
  });

  /** Checks also if the cursor is at the right position when adding heading */
  test('Add Header Above 03', async ({ page }) => {
    await page.notebook.selectCells(3);
    await page.keyboard.press('Shift+A');
    await page.waitForTimeout(200);
    expect(
      await (await page.notebook.getNotebookInPanel()).screenshot()
    ).toMatchSnapshot('add_header_above_03.png');
  });
});
