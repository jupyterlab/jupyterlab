// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { expect, galata, test } from '@jupyterlab/galata';
import { ElementHandle } from '@playwright/test';
import * as path from 'path';

const fileName = 'windowed_notebook.ipynb';
const injectionFile = 'css_js_injection.ipynb';

test.use({
  mockSettings: {
    ...galata.DEFAULT_SETTINGS,
    '@jupyterlab/notebook-extension:tracker': {
      ...galata.DEFAULT_SETTINGS['@jupyterlab/notebook-extension:tracker'],
      windowingMode: 'full'
    }
  }
});

test.beforeEach(async ({ page, tmpPath }) => {
  await page.contents.uploadFile(
    path.resolve(__dirname, `../galata/notebooks/${fileName}`),
    `${tmpPath}/${fileName}`
  );
  await page.contents.uploadFile(
    path.resolve(__dirname, `./notebooks/${injectionFile}`),
    `${tmpPath}/${injectionFile}`
  );
});

async function getInnerHeight(panel: ElementHandle<Element>) {
  return parseInt(
    await panel.$eval(
      '.jp-WindowedPanel-inner',
      node => (node as HTMLElement).style.height
    ),
    10
  );
}
async function getWindowHeight(panel: ElementHandle<Element>) {
  return parseInt(
    await panel.$eval(
      '.jp-WindowedPanel-window',
      node => (node as HTMLElement).style.minHeight
    ),
    10
  );
}

test('should update window height on resize', async ({ page, tmpPath }) => {
  // Note: this needs many small cells so that they get added during resize changing height.
  const notebookName = '20_empty_cells.ipynb';
  await page.contents.uploadFile(
    path.resolve(__dirname, `notebooks/${notebookName}`),
    `${tmpPath}/${notebookName}`
  );
  await page.notebook.openByPath(`${tmpPath}/${notebookName}`);

  const notebook = await page.notebook.getNotebookInPanel();

  // Measure height when the notebook is open but launcher closed
  const fullHeight = await getWindowHeight(notebook);

  // Add a new launcher below the notebook
  await page.evaluate(async () => {
    const widget = await window.jupyterapp.commands.execute('launcher:create');
    window.jupyterapp.shell.add(widget, 'main', { mode: 'split-bottom' });
  });
  // Measure height after splitting the dock area
  const heightAfterSplit = await getWindowHeight(notebook);

  expect(heightAfterSplit).toBeLessThan(fullHeight);

  // Resize the dock panel, increasing the notebook height/decreasing the launcher height.
  const resizeHandle = page.locator(
    '.lm-DockPanel-handle[data-orientation="vertical"]:visible'
  );
  await resizeHandle.dragTo(page.locator('#jp-main-statusbar'));

  // Measure height after resizing
  const heightAfterResize = await getWindowHeight(notebook);

  expect(heightAfterResize).toBeGreaterThan(heightAfterSplit);
});

test('should not update height when hiding', async ({ page, tmpPath }) => {
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);

  // Wait to ensure the rendering logic is stable.
  await page.waitForTimeout(200);

  const notebook = await page.notebook.getNotebookInPanel();
  const initialHeight = await getInnerHeight(notebook);

  expect(initialHeight).toBeGreaterThan(0);

  // Add a new launcher covering the notebook.
  await page.menu.clickMenuItem('File>New Launcher');

  const innerHeight = await getInnerHeight(notebook);

  expect(innerHeight).toEqual(initialHeight);
});

test('should hide first code cell when scrolling down', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);

  const h = await page.notebook.getNotebookInPanel();
  const firstCellSelector = '.jp-Cell[data-windowed-list-index="0"]';
  const firstCell = await h!.waitForSelector(firstCellSelector);

  const bbox = await h!.boundingBox();
  await page.mouse.move(bbox!.x, bbox!.y);
  await Promise.all([
    firstCell.waitForElementState('hidden'),
    page.mouse.wheel(0, 600)
  ]);

  // Check the content contains only the output
  expect(await firstCell.textContent()).toEqual('[16]:local link\n');
});

test('should reattached a code code cell when scrolling back into the viewport', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);

  const h = await page.notebook.getNotebookInPanel();
  const firstCellSelector = '.jp-Cell[data-windowed-list-index="0"]';
  const firstCell = await h!.waitForSelector(firstCellSelector);

  const bbox = await h!.boundingBox();
  await page.mouse.move(bbox!.x, bbox!.y);
  await Promise.all([
    firstCell.waitForElementState('hidden'),
    h!.waitForSelector('.jp-MarkdownCell[data-windowed-list-index="6"]'),
    page.mouse.wheel(0, 1200)
  ]);

  await Promise.all([
    firstCell.waitForElementState('visible'),
    page.mouse.wheel(0, -1200)
  ]);

  // Check that the input area is back
  expect(await firstCell.waitForSelector('.jp-InputArea')).toBeDefined();
});

test('should detach a markdown code cell when scrolling out of the viewport', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);

  const h = await page.notebook.getNotebookInPanel();
  const mdCellSelector = '.jp-MarkdownCell[data-windowed-list-index="2"]';
  const mdCell = await h!.waitForSelector(mdCellSelector);

  const bbox = await h!.boundingBox();
  await page.mouse.move(bbox!.x, bbox!.y);
  await Promise.all([
    mdCell.waitForElementState('hidden'),
    page.mouse.wheel(0, 1200)
  ]);

  let found = true;
  try {
    await h!.waitForSelector(mdCellSelector, { timeout: 150 });
  } catch (r) {
    found = false;
  }
  expect(found).toEqual(false);
});

test('should reattach a markdown code cell when scrolling back into the viewport', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);

  const h = await page.notebook.getNotebookInPanel();
  const mdCellSelector = '.jp-MarkdownCell[data-windowed-list-index="2"]';
  const mdCell = await h!.waitForSelector(mdCellSelector);

  const bbox = await h!.boundingBox();
  await page.mouse.move(bbox!.x, bbox!.y);
  await Promise.all([
    mdCell.waitForElementState('hidden'),
    h!.waitForSelector('.jp-MarkdownCell[data-windowed-list-index="6"]'),
    page.mouse.wheel(0, 1200)
  ]);

  await page.waitForTimeout(400);

  await page.mouse.wheel(0, -1200);

  expect(await h!.waitForSelector(mdCellSelector)).toBeDefined();
});

test('should remove all cells including hidden outputs artifacts', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);

  const h = await page.notebook.getNotebookInPanel();

  const bbox = await h!.boundingBox();
  await page.mouse.move(bbox!.x, bbox!.y);
  await Promise.all([
    h!.waitForSelector('.jp-MarkdownCell[data-windowed-list-index="6"]'),
    page.mouse.wheel(0, 1200)
  ]);

  // Select all cells
  await page.keyboard.press('Control+a');
  // Delete all cells
  await page.keyboard.press('d');
  await page.keyboard.press('d');

  // Check that the notebook only contains one cell
  expect(await (await h!.$('.jp-WindowedPanel-inner'))!.textContent()).toEqual(
    '[ ]:'
  );

  // Check there are no hidden cells
  let found = true;
  try {
    await h!.waitForSelector('.jp-Cell', { state: 'hidden', timeout: 150 });
  } catch (r) {
    found = false;
  }
  expect(found).toEqual(false);
});

test('should scroll as little as possible on markdown rendering', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);
  const h = await page.notebook.getNotebookInPanel();
  const mdCell = await h.waitForSelector(
    '.jp-MarkdownCell[data-windowed-list-index="2"]'
  );

  await page
    .locator('.jp-Notebook-ExecutionIndicator[data-status="idle"]')
    .waitFor();

  await mdCell.click();

  const thirdCell = page.locator('.jp-CodeCell[data-windowed-list-index="3"]');
  const fourthCell = page.locator('.jp-RawCell[data-windowed-list-index="4"]');

  await expect.soft(thirdCell).not.toBeInViewport({ ratio: 0.1 });
  await expect.soft(fourthCell).not.toBeInViewport();

  await page.keyboard.press('Shift+Enter');

  await expect(thirdCell).toBeInViewport();
  await expect(fourthCell).not.toBeInViewport({ ratio: 0.1 });
});

test('should rendered injected styles of out-of-viewport cells', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${injectionFile}`);
  await page.notebook.trust();

  // Check the cell is out of the viewport
  await expect
    .soft(page.locator('.jp-Cell[data-windowed-list-index="4"]'))
    .not.toBeVisible();

  await page.waitForFunction(() => {
    const cell = document.querySelector('.jp-Notebook-cell');
    if (cell) {
      return (
        window.getComputedStyle(cell, '::after').content ==
        '"CSS ::after element"'
      );
    } else {
      return false;
    }
  });

  const afterCellCount = await page.evaluate(() => {
    let count = 0;
    for (const cell of document.querySelectorAll('.jp-Notebook-cell')) {
      count +=
        window.getComputedStyle(cell, '::after').content ==
        '"CSS ::after element"'
          ? 1
          : 0;
    }
    return count;
  });

  expect(afterCellCount).toBeGreaterThan(1);
});

test('should rendered injected HTML scripts of out-of-viewport cells', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${injectionFile}`);
  await page.notebook.trust();

  // Check the cell is out of the viewport
  await expect
    .soft(page.locator('.jp-Cell[data-windowed-list-index="4"]'))
    .not.toBeVisible();

  await page.getByText('JavaScript injected from HTML').first().waitFor();
  expect(
    await page.getByText('JavaScript injected from HTML').count()
  ).toBeGreaterThan(1);
});

test('should rendered injected JavaScript snippets of out-of-viewport cells', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${injectionFile}`);
  await page.notebook.trust();

  // Check the cell is out of the viewport
  await expect
    .soft(page.locator('.jp-Cell[data-windowed-list-index="4"]'))
    .not.toBeVisible();

  await page.getByText('JavaScript injected header').first().waitFor();
  expect(
    await page.getByText('JavaScript injected header').count()
  ).toBeGreaterThan(1);
});

test('should navigate to a search hit in a out-of-viewport cell', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);

  // Open search box
  await page.keyboard.press('Control+f');

  await page.getByPlaceholder('Find').fill('IFrame');
  await page.getByText('1/2').waitFor();
  await expect
    .soft(page.locator('.jp-Cell[data-windowed-list-index="11"]'))
    .toHaveCount(0);

  await page.getByRole('button', { name: 'Next Match' }).click();

  await page.locator('.jp-Cell[data-windowed-list-index="11"]').waitFor();
  await expect
    .soft(page.locator('.jp-Cell[data-windowed-list-index="11"]'))
    .toContainText('IFrame');

  await page.getByPlaceholder('Find').fill('Final');
  await page.getByText('1/1').waitFor();
  await expect
    .soft(page.locator('.jp-Cell[data-windowed-list-index="18"]'))
    .toHaveCount(0);

  await page.getByRole('button', { name: 'Previous Match' }).click();

  await page.locator('.jp-Cell[data-windowed-list-index="18"]').waitFor();
  await expect(
    page.locator('.jp-Cell[data-windowed-list-index="18"]')
  ).toContainText('Final');
});
