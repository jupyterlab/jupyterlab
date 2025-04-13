// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { expect, galata, test } from '@jupyterlab/galata';
import { Locator } from '@playwright/test';
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

async function getInnerHeight(panel: Locator) {
  return parseInt(
    await panel
      .locator('.jp-WindowedPanel-inner')
      .evaluate(node => (node as HTMLElement).style.height),
    10
  );
}

test('should update displayed cells on resize', async ({ page, tmpPath }) => {
  // Note: this needs many small cells so that they get added during resize changing height.
  const notebookName = '20_empty_cells.ipynb';
  await page.contents.uploadFile(
    path.resolve(__dirname, `notebooks/${notebookName}`),
    `${tmpPath}/${notebookName}`
  );
  await page.notebook.openByPath(`${tmpPath}/${notebookName}`);

  const notebook = await page.notebook.getNotebookInPanelLocator();

  const cell = notebook.locator('.jp-Cell[data-windowed-list-index="10"]');

  // Cell should be visible
  await expect.soft(cell).toBeVisible();

  // Add a new launcher below the notebook
  await page.evaluate(async () => {
    const widget = await window.jupyterapp.commands.execute('launcher:create');
    window.jupyterapp.shell.add(widget, 'main', { mode: 'split-bottom' });
  });

  // The cell should no longer be visible
  await expect.soft(cell).not.toBeVisible();

  // Resize the dock panel, increasing the notebook height/decreasing the launcher height.
  const resizeHandle = page.locator(
    '.lm-DockPanel-handle[data-orientation="vertical"]:visible'
  );
  await resizeHandle.dragTo(page.locator('#jp-main-statusbar'));

  // The cell should be visible aqain
  await expect.soft(cell).toBeVisible();
});

test('should not update height when hiding', async ({ page, tmpPath }) => {
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);
  const notebook = await page.notebook.getNotebookInPanelLocator();
  let initialHeight = 0;
  let previousHeight = 0;
  let counter = 0;

  // Wait to ensure the rendering logic is stable.
  do {
    previousHeight = initialHeight;
    await page.waitForTimeout(300);

    initialHeight = await getInnerHeight(notebook!);
  } while (previousHeight !== initialHeight && counter++ < 10);

  expect.soft(initialHeight).toBeGreaterThan(0);

  // Add a new launcher covering the notebook.
  await page.menu.clickMenuItem('File>New Launcher');

  const innerHeight = await getInnerHeight(notebook!);

  expect(innerHeight).toEqual(initialHeight);
});

test('should hide first inactive code cell when scrolling down', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);

  // Activate >second< cell
  await page.notebook.selectCells(1);
  // Test if the >first< (now inactive) cell gets detached
  const h = await page.notebook.getNotebookInPanelLocator();
  const firstCell = h!.locator('.jp-Cell[data-windowed-list-index="0"]');
  await firstCell.waitFor();

  const bbox = await h!.boundingBox();
  await page.mouse.move(bbox!.x, bbox!.y);
  await Promise.all([
    firstCell.waitFor({ state: 'hidden' }),
    page.mouse.wheel(0, 600)
  ]);

  // Check the content contains only the output
  expect(await firstCell.textContent()).toEqual('[16]:local link\n');
});

test('should reattached inactive code cell when scrolling back into the viewport', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);

  // Activate >second< cell
  await page.notebook.selectCells(1);
  // Test if the >first< (now inactive) cell gets re-attached
  const h = await page.notebook.getNotebookInPanelLocator();
  const firstCell = h!.locator('.jp-Cell[data-windowed-list-index="0"]');
  await firstCell.waitFor();

  const bbox = await h!.boundingBox();
  await page.mouse.move(bbox!.x, bbox!.y);
  await Promise.all([
    firstCell.waitFor({ state: 'hidden' }),
    h!.locator('.jp-MarkdownCell[data-windowed-list-index="6"]').waitFor(),
    page.mouse.wheel(0, 1200)
  ]);

  await Promise.all([
    firstCell.waitFor({ state: 'visible' }),
    page.mouse.wheel(0, -1200)
  ]);

  // Check that the input area is back
  await expect(firstCell.locator('.jp-InputArea')).toHaveCount(1);
});

test('should not detach active code cell input when scrolling down', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);

  await page.notebook.selectCells(0);
  const h = await page.notebook.getNotebookInPanelLocator();
  const firstCell = h!.locator('.jp-Cell[data-windowed-list-index="0"]');
  await firstCell.waitFor();

  const bbox = await h!.boundingBox();
  await page.mouse.move(bbox!.x, bbox!.y);
  await Promise.all([
    firstCell.waitFor({ state: 'hidden' }),
    page.mouse.wheel(0, 1200)
  ]);

  // Check the input is still defined
  await expect(firstCell.locator('.jp-InputArea')).toHaveCount(1);
});

for (const cellType of ['code', 'markdown']) {
  test(`should scroll back to the active ${cellType} cell on typing`, async ({
    page,
    tmpPath
  }) => {
    await page.notebook.openByPath(`${tmpPath}/${fileName}`);

    await page.notebook.setCellType(0, cellType);
    await page.notebook.enterCellEditingMode(0);
    const h = await page.notebook.getNotebookInPanelLocator();
    const firstCell = h!.locator('.jp-Cell[data-windowed-list-index="0"]');
    await firstCell.waitFor();

    const bbox = await h!.boundingBox();
    await page.mouse.move(bbox!.x, bbox!.y);
    await Promise.all([
      firstCell.waitFor({ state: 'hidden' }),
      page.mouse.wheel(0, 1200)
    ]);

    // Type in the cell
    await page.keyboard.type('TEST', { delay: 150 });

    // Expect the cell to become visible again
    await firstCell.waitFor({ state: 'visible' });

    // Expect the text to populate the cell editor
    const firstCellInput = await page.notebook.getCellInputLocator(0);
    expect(await firstCellInput!.textContent()).toContain('TEST');
  });
}

const scrollOnKeyPressCases: {
  key: string;
  showCell: 'first' | 'second' | 'neither';
  times: number;
  enterEditor: boolean;
}[] = [
  {
    // When pressing arrow down the second cell should become selected.
    key: 'ArrowDown',
    showCell: 'second',
    times: 1,
    enterEditor: false
  },
  {
    // Pressing Alt does not cause any input nor cursor movement so it should
    // not cause any scrolling. This test in particular tests against an easy
    // mistake of force-focusing the active editor which is out of view which
    // can cause partial scrolling in the direction of the editor. Because the
    // scrolling is only partial multiple presses are needed.
    key: 'Alt',
    showCell: 'neither',
    times: 10,
    enterEditor: true
  },
  {
    // Because the cursor starts at the beginning of the first cell, a single
    // press of PageDown should just move the cursor to the end, which should
    // reveal the editor by scrolling to the first cell.
    key: 'PageDown',
    showCell: 'first',
    times: 1,
    enterEditor: true
  },
  {
    // Pressing `PageDown` multiple times should scroll the notebook in a way
    // which hides both cells (even though the first press would reveal them).
    key: 'PageDown',
    showCell: 'neither',
    times: 10,
    enterEditor: true
  }
];
test.describe('Scrolling on keyboard interaction when active editor is above the viewport', () => {
  for (const testCase of scrollOnKeyPressCases) {
    test(`Show ${testCase.showCell} cell on pressing ${testCase.key} ${testCase.times} times`, async ({
      page,
      tmpPath
    }) => {
      await page.notebook.openByPath(`${tmpPath}/${fileName}`);

      // Activate the first cell.
      await page.notebook.selectCells(0);
      const h = await page.notebook.getNotebookInPanelLocator();
      const firstCell = h!.locator('.jp-Cell[data-windowed-list-index="0"]');
      const secondCell = h!.locator('.jp-Cell[data-windowed-list-index="1"]');
      await firstCell.waitFor();
      await secondCell.waitFor();

      if (testCase.enterEditor) {
        await page.notebook.enterCellEditingMode(0);
        // Move cursor in the first cell to the beginning of the source code
        await page.keyboard.press('Home');
      }

      // Position the mouse in the bounding box to allow for scrolling with mouse wheel
      const bbox = await h!.boundingBox();
      await page.mouse.move(bbox!.x, bbox!.y);

      // Scroll down to hide the first and second cell
      await Promise.all([
        firstCell.waitFor({ state: 'hidden' }),
        secondCell.waitFor({ state: 'hidden' }),
        page.mouse.wheel(0, 1200)
      ]);

      // Press the key as many times as requested
      for (let i = 0; i < testCase.times; i++) {
        await page.keyboard.press(testCase.key);
        // Allow for small delay between pressing keys
        await page.waitForTimeout(100);
      }

      if (testCase.showCell === 'neither') {
        // For negative test case we need to add an explicit timeout to test
        // against the possibility of the scroll happening with a small delay.
        await page.waitForTimeout(400);
        await expect(firstCell).toBeHidden();
        await expect(secondCell).toBeHidden();
      } else {
        const cell = testCase.showCell === 'first' ? firstCell : secondCell;
        // Expect the cell to become visible again.
        await cell.waitFor({ state: 'visible' });
      }
    });
  }
});

test('should detach a markdown code cell when scrolling out of the viewport', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);

  const h = await page.notebook.getNotebookInPanelLocator();
  const mdCell = h!.locator('.jp-MarkdownCell[data-windowed-list-index="2"]');
  await mdCell.waitFor();

  const bbox = await h!.boundingBox();
  await page.mouse.move(bbox!.x, bbox!.y);
  await Promise.all([
    mdCell.waitFor({ state: 'hidden' }),
    page.mouse.wheel(0, 1200)
  ]);

  let found = true;
  try {
    await mdCell.waitFor({ timeout: 150 });
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

  const h = await page.notebook.getNotebookInPanelLocator();
  const mdCell = h!.locator('.jp-MarkdownCell[data-windowed-list-index="2"]');
  await mdCell.waitFor();

  const bbox = await h!.boundingBox();
  await page.mouse.move(bbox!.x, bbox!.y);
  await Promise.all([
    mdCell.waitFor({ state: 'hidden' }),
    h!.locator('.jp-MarkdownCell[data-windowed-list-index="6"]').waitFor(),
    page.mouse.wheel(0, 1200)
  ]);

  await page.waitForTimeout(400);

  await page.mouse.wheel(0, -1200);

  await expect(mdCell).toBeVisible();
});

test('should remove all cells including hidden outputs artifacts', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);

  const h = await page.notebook.getNotebookInPanelLocator();

  const bbox = await h!.boundingBox();
  await page.mouse.move(bbox!.x, bbox!.y);
  await Promise.all([
    h!.locator('.jp-MarkdownCell[data-windowed-list-index="6"]').waitFor(),
    page.mouse.wheel(0, 1200)
  ]);

  // Select all cells
  await page.keyboard.press('Control+a');
  // Delete all cells
  await page.keyboard.press('d');
  await page.keyboard.press('d');

  // Check that the notebook only contains one cell
  expect(await h!.locator('.jp-WindowedPanel-inner')!.textContent()).toEqual(
    '[ ]:'
  );

  // Check there are no hidden cells
  let found = true;
  try {
    await h!.locator('.jp-Cell').waitFor({ state: 'hidden', timeout: 150 });
  } catch (r) {
    found = false;
  }
  expect(found).toEqual(false);
});

test('should display cells below on scrolling after inserting a cell on top', async ({
  page,
  tmpPath
}) => {
  // Regression test against "disappearing cells" issue:
  // https://github.com/jupyterlab/jupyterlab/issues/16978
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);

  const notebook = await page.notebook.getNotebookInPanelLocator()!;
  const firstCell = notebook.locator('.jp-Cell[data-windowed-list-index="1"]');
  const lastCell = notebook.locator('.jp-Cell[data-windowed-list-index="18"]');
  await firstCell.waitFor();

  const bbox = await notebook.boundingBox();
  await page.mouse.move(bbox!.x, bbox!.y);

  // Needs to be two separate mouse wheel events.
  await page.mouse.wheel(0, 3000);
  await page.mouse.wheel(0, 3000);

  // Scroll down to reveal last cell to ensure these all items have been measured...
  await Promise.all([
    firstCell.waitFor({ state: 'hidden' }),
    lastCell.waitFor()
  ]);

  await page.mouse.wheel(0, -3000);
  await page.mouse.wheel(0, -3000);

  // ...then scroll back up and select first cell.
  await Promise.all([
    lastCell.waitFor({ state: 'hidden' }),
    firstCell.waitFor()
  ]);
  await page.notebook.selectCells(0);

  // Insert cell below.
  await page.keyboard.press('b');
  await page.mouse.wheel(0, 3000);
  await page.mouse.wheel(0, 3000);

  // Scroll down again.
  await Promise.all([
    firstCell.waitFor({ state: 'hidden' }),
    lastCell.waitFor()
  ]);
  await expect(lastCell).toBeVisible();
});

test('should center on next cell after rendering markdown cell and advancing', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);
  const mdCell = page.locator('.jp-MarkdownCell[data-windowed-list-index="2"]');
  const thirdCell = page.locator('.jp-CodeCell[data-windowed-list-index="3"]');
  const fourthCell = page.locator('.jp-RawCell[data-windowed-list-index="4"]');

  await page
    .locator('.jp-Notebook-ExecutionIndicator[data-status="idle"]')
    .waitFor();

  // Un-render markdown cell
  await page.notebook.enterCellEditingMode(2);

  // The next cells should not be (significantly) visible (yet)
  await expect.soft(thirdCell).not.toBeInViewport({ ratio: 0.1 });
  await expect.soft(fourthCell).not.toBeInViewport();

  // Render current (markdown) cell and advance
  await page.keyboard.press('Shift+Enter');

  // The notebook should advance to next (third) cell and make it fully visible
  await expect(thirdCell).toBeInViewport({ ratio: 1 });

  // Because the third cell is not larger than the notebook viewport,
  // the surrounding cells should be visible after it got centered:
  // - the previous cell should still be visible
  await expect(mdCell).toBeInViewport({ ratio: 1 });
  // - the next cell should now be visible too
  await expect(fourthCell).toBeInViewport({ ratio: 1 });
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
    .not.toBeVisible();

  await page.getByRole('button', { name: 'Next Match (Ctrl+G)' }).click();

  await page.locator('.jp-Cell[data-windowed-list-index="11"]').waitFor();
  await expect
    .soft(page.locator('.jp-Cell[data-windowed-list-index="11"]'))
    .toContainText('IFrame');

  await page.getByPlaceholder('Find').fill('Final');
  await page.getByText('1/1').waitFor();
  await expect
    .soft(page.locator('.jp-Cell[data-windowed-list-index="18"]'))
    .not.toBeVisible();

  await page
    .getByRole('button', { name: 'Previous Match (Ctrl+Shift+G)' })
    .click();

  await page.locator('.jp-Cell[data-windowed-list-index="18"]').waitFor();
  await expect(
    page.locator('.jp-Cell[data-windowed-list-index="18"]')
  ).toContainText('Final');
});
