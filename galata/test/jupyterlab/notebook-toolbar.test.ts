// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, IJupyterLabPageFixture, test } from '@jupyterlab/galata';

const fileName = 'notebook.ipynb';

async function populateNotebook(page: IJupyterLabPageFixture) {
  await page.notebook.setCell(0, 'raw', 'Just a raw cell');
  await page.notebook.addCell(
    'markdown',
    '## This is **bold** and *italic* [link to jupyter.org!](http://jupyter.org)'
  );
  await page.notebook.addCell('code', '2 ** 3');
}

test.describe('Notebook Toolbar', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(fileName);
    await populateNotebook(page);
  });

  test('Insert cells', async ({ page }) => {
    const imageName = 'insert-cells.png';
    await page.notebook.selectCells(0);
    await page.notebook.clickToolbarItem('insert');
    await page.notebook.selectCells(2);
    await page.notebook.clickToolbarItem('insert');
    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(imageName);
  });

  test('Copy-Paste cell', async ({ page }) => {
    const imageName = 'copy-paste-cell.png';
    await page.notebook.selectCells(2);
    await page.notebook.clickToolbarItem('copy');
    await page.notebook.selectCells(0);
    await page.notebook.clickToolbarItem('paste');
    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(imageName);
  });

  test('Cut cell', async ({ page }) => {
    const imageName = 'cut-cell.png';
    await page.notebook.selectCells(1);
    await page.notebook.clickToolbarItem('cut');
    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(imageName);
  });

  test('Paste cell', async ({ page }) => {
    // Cut cell to populate clipboard
    await page.notebook.selectCells(1);
    await page.notebook.clickToolbarItem('cut');

    const imageName = 'paste-cell.png';
    await page.notebook.selectCells(1);
    await page.notebook.clickToolbarItem('paste');
    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(imageName);
  });

  test('Delete cells', async ({ page }) => {
    const imageName = 'delete-cell.png';
    await page.notebook.selectCells(1, 2);
    await page.menu.clickMenuItem('Edit>Delete Cells');
    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(imageName);
  });

  test('Run cell', async ({ page }) => {
    const imageName = 'run-cell.png';
    await page.notebook.selectCells(2);

    await page.notebook.clickToolbarItem('run');
    await page.waitForSelector('text=8');

    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(imageName);
  });

  test('Change cell type to Markdown', async ({ page }) => {
    const imageName = 'change-to-markdown.png';
    await page.notebook.selectCells(2);
    await page.notebook.clickToolbarItem('cellType');
    await page.keyboard.press('m');
    await page.keyboard.press('Enter');
    await page.notebook.selectCells(2);
    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(imageName);
  });
});

test('Toolbar items act on owner widget', async ({ page }) => {
  // Given two side-by-side notebooks and the second being active
  const file1 = 'notebook1.ipynb';
  await page.notebook.createNew(file1);
  const panel1 = await page.activity.getPanel(file1);
  const tab1 = await page.activity.getTab(file1);

  // FIXME Calling a second time `page.notebook.createNew` is not robust
  await page.menu.clickMenuItem('File>New>Notebook');
  try {
    await page.waitForSelector('.jp-Dialog', { timeout: 5000 });
    await page.click('.jp-Dialog .jp-mod-accept');
  } catch (reason) {
    // no-op
  }

  const tab2 = await page.activity.getTab();

  const tab2BBox = await tab2.boundingBox();
  await page.mouse.move(
    tab2BBox.x + 0.5 * tab2BBox.width,
    tab2BBox.y + 0.5 * tab2BBox.height
  );
  await page.mouse.down();
  await page.mouse.move(900, tab2BBox.y + tab2BBox.height + 200);
  await page.mouse.up();

  const classlist = await tab1.getAttribute('class');
  expect(classlist.split(' ')).not.toContain('jp-mod-current');

  // When clicking on toolbar item of the first file
  await (
    await panel1.$('button[data-command="notebook:insert-cell-below"]')
  ).click();

  // Then the first file is activated and the action is performed
  const classlistEnd = await tab1.getAttribute('class');
  expect(classlistEnd.split(' ')).toContain('jp-mod-current');
  expect(await page.notebook.getCellCount()).toEqual(2);
});
