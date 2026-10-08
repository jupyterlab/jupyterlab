// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IJupyterLabPageFixture } from '@jupyterlab/galata';
import { expect, galata, test } from '@jupyterlab/galata';

const fileName = 'notebook.ipynb';

/**
 * A minimal output attaching an open shadow root, as done by widget libraries
 * such as Panel or Bokeh.
 */
const shadowDOMOutput = `\
from IPython.display import HTML
HTML("""<div id='shadow-host'></div><script>
document.querySelector('#shadow-host').attachShadow({mode: 'open'}).innerHTML =
  '<p id="shadow-first">alpha beta gamma</p><p id="shadow-second">delta epsilon zeta</p>';
</script>""")`;

async function populateNotebook(page: IJupyterLabPageFixture) {
  await page.notebook.setCell(0, 'raw', 'Just a raw cell');
  await page.notebook.addCell(
    'markdown',
    '## This is **bold** and *italic* [link to jupyter.org!](http://jupyter.org)'
  );
  await page.notebook.addCell('code', '2 ** 3');
}

/**
 * Select the first occurrence of `text` below `rootSelector`.
 *
 * When `pierceShadow` is set, `rootSelector` must point at a shadow host and
 * the text is looked up in its open shadow root rather than in its light DOM.
 */
async function selectText(
  page: IJupyterLabPageFixture,
  rootSelector: string,
  text: string,
  pierceShadow = false
): Promise<void> {
  await page.evaluate(
    ({ rootSelector, text, pierceShadow }) => {
      const host = document.querySelector(rootSelector);
      const root = pierceShadow ? host?.shadowRoot : host;
      if (!root) {
        throw new Error(`No root found for ${rootSelector}`);
      }
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const start = node.textContent?.indexOf(text) ?? -1;
        if (start === -1) {
          continue;
        }
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, start + text.length);
        const selection = window.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      throw new Error(`Text "${text}" not found below ${rootSelector}`);
    },
    { rootSelector, text, pierceShadow }
  );
}

test.describe('Notebook Edit', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(fileName);
  });

  test('Execute Code cell', async ({ page }) => {
    await page.notebook.addCell('code', '2 ** 3');
    await page.notebook.runCell(1, true);
    const imageName = 'run-cell.png';
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    await nbPanel!.locator('.jp-mod-active .jp-cell-toolbar').waitFor();
    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Re-edit after execution', async ({ page }) => {
    await page.notebook.addCell('code', '2 ** 3');
    await page.notebook.runCell(1, true);
    await page.notebook.setCell(1, 'code', '2 ** 6');

    const imageName = 'reedit-cell.png';
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    await nbPanel!.locator('.jp-mod-active .jp-cell-toolbar').waitFor();
    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Re-render Markdown after edit', async ({ page }) => {
    // Add an image and render
    await page.notebook.addCell('markdown', '![alt text](./image.png)');
    await page.notebook.runCell(1, true);

    // There should be no link rendered in the cell, just an image
    const cell = await page.notebook.getCellLocator(1);
    const image = cell!.locator('img');
    const link = cell!.locator('a');
    await expect(link).toHaveCount(0);
    await expect(image).toHaveCount(1);

    // Edit and re-render the cell
    await page.notebook.setCell(1, 'markdown', '[link](https://jupyter.org)');
    await page.notebook.runCell(1, true);

    // There should be a link but not an image
    await expect(link).toHaveCount(1);
    await expect(image).toHaveCount(0);

    // Double-check we see the right link
    await expect(link).toContainText('link');
  });

  test('Cut from code and paste into a Markdown cell', async ({ page }) => {
    const text = 'text to be pasted';
    await page.notebook.addCell('code', text);
    await page.notebook.addCell('markdown', '');

    const codeCell = await page.notebook.getCellLocator(1);
    const markdownCell = await page.notebook.getCellLocator(2);

    await expect(codeCell!).toContainText(text);
    await expect(markdownCell!).not.toContainText(text);

    // Cut from the code cell
    await page.notebook.enterCellEditingMode(1);
    await page.keyboard.press('Control+KeyA');
    await page.keyboard.press('Control+KeyX');

    // Paste into the markdown cell
    await page.notebook.enterCellEditingMode(2);
    await page.keyboard.press('Control+KeyV');

    await expect(codeCell!).not.toContainText(text);
    await expect(markdownCell!).toContainText(text);
  });

  test('Execute again', async ({ page }) => {
    await page.notebook.addCell('code', '2 ** 3');
    await page.notebook.runCell(1, true);
    await page.notebook.setCell(1, 'code', '2 ** 6');

    const imageName = 'execute-again.png';
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    await nbPanel!.locator('.jp-mod-active .jp-cell-toolbar').waitFor();
    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Copy-Paste cell', async ({ page }) => {
    await populateNotebook(page);

    let imageName = 'copy-paste-cell.png';
    await page.notebook.selectCells(1);
    await page.menu.clickMenuItem('Edit>Copy Cell');
    await page.notebook.selectCells(0);
    await page.menu.clickMenuItem('Edit>Paste Cell Above');
    let nbPanel = await page.notebook.getNotebookInPanelLocator();

    await nbPanel!.locator('.jp-mod-active .jp-cell-toolbar').waitFor();
    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Cut-Paste cell', async ({ page }) => {
    await populateNotebook(page);

    const imageName = 'cut-paste-cell.png';
    await page.notebook.selectCells(0);
    await page.menu.clickMenuItem('Edit>Cut Cell');
    await page.notebook.selectCells(0);
    await page.menu.clickMenuItem('Edit>Paste Cell Below');
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    await nbPanel!.locator('.jp-mod-active .jp-cell-toolbar').waitFor();
    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Paste-Replace cell', async ({ page }) => {
    await populateNotebook(page);

    const imageName = 'paste-replace-cell.png';
    await page.notebook.selectCells(0);
    await page.menu.clickMenuItem('Edit>Copy Cell');
    await page.notebook.selectCells(2);
    await page.menu.clickMenuItem('Edit>Paste Cell and Replace');
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    await nbPanel!.locator('.jp-mod-active .jp-cell-toolbar').waitFor();
    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Delete cell', async ({ page }) => {
    await populateNotebook(page);

    const imageName = 'delete-cell.png';
    await page.notebook.selectCells(2);
    await page.menu.clickMenuItem('Edit>Delete Cell');
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    // Here the toolbar should be hidden due to overlap with Markdown cell text
    await nbPanel!
      .locator('.jp-mod-active .jp-cell-toolbar')
      .waitFor({ state: 'hidden' });
    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Select all cells', async ({ page }) => {
    await populateNotebook(page);
    const imageName = 'select-all-cells.png';
    await page.notebook.selectCells(2);
    await page.menu.clickMenuItem('Edit>Select All Cells');
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    await nbPanel!.locator('.jp-mod-active .jp-cell-toolbar').waitFor();
    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Deselect all cells', async ({ page }) => {
    await populateNotebook(page);
    const imageName = 'deselect-all-cells.png';
    await page.notebook.selectCells(1, 2);
    await page.menu.clickMenuItem('Edit>Deselect All Cells');
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    await nbPanel!.locator('.jp-mod-active .jp-cell-toolbar').waitFor();
    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Shift-click extends cell selection after selecting editor text', async ({
    page
  }) => {
    await page.notebook.setCell(0, 'code', 'first');
    await page.notebook.addCell('code', 'second');
    await page.notebook.addCell('code', 'third');

    await page.notebook.enterCellEditingMode(0);
    await page.keyboard.press('Home');
    await page.keyboard.press('Shift+End');

    await expect
      .poll(async () => page.evaluate(() => window.getSelection()?.toString()))
      .toBe('first');

    const firstCell = await page.notebook.getCellLocator(0);
    const secondCell = await page.notebook.getCellLocator(1);
    const thirdCell = await page.notebook.getCellLocator(2);

    await firstCell!.locator('.jp-InputArea-prompt').click();
    await thirdCell!.locator('.jp-InputArea-prompt').click({
      modifiers: ['Shift']
    });

    await expect(firstCell!).toHaveClass(/jp-mod-selected/);
    await expect(secondCell!).toHaveClass(/jp-mod-selected/);
    await expect(thirdCell!).toHaveClass(/jp-mod-selected/);
    await expect(thirdCell!).toHaveClass(/jp-mod-active/);
  });

  test('Shift-click extends text selection in a rendered markdown cell', async ({
    page
  }) => {
    await page.notebook.setCell(
      0,
      'markdown',
      'alpha beta gamma\n\ndelta epsilon zeta'
    );
    await page.notebook.addCell('code', '1 + 1');
    await page.notebook.addCell('code', '2 + 2');

    // Render the markdown cell.
    await page.notebook.runCell(0);

    const firstCell = await page.notebook.getCellLocator(0);
    const secondCell = await page.notebook.getCellLocator(1);
    const thirdCell = await page.notebook.getCellLocator(2);
    await firstCell!.locator('.jp-MarkdownOutput').waitFor();

    // Make the last cell active, so that extending the cell selection to the
    // first cell would visibly select all three cells.
    await thirdCell!.locator('.jp-InputArea-prompt').click();

    await selectText(page, '.jp-MarkdownOutput', 'beta');

    // Shift-click a later paragraph of the SAME rendered markdown cell.
    await firstCell!
      .locator('.jp-MarkdownOutput p')
      .nth(1)
      .click({ modifiers: ['Shift'] });

    // The browser owns this gesture: the notebook must not turn it into a
    // cell range selection, and the text selection must reach the click.
    // Note that the active cell is itself `jp-mod-selected`, so the cells in
    // between are what tell a range selection apart from a single one.
    await expect(secondCell!).not.toHaveClass(/jp-mod-selected/);
    await expect(thirdCell!).not.toHaveClass(/jp-mod-selected/);
    expect(
      await page.evaluate(() => window.getSelection()?.toString() ?? '')
    ).toContain('delta');
  });

  test('Shift-click extends text selection in an output using shadow DOM', async ({
    page
  }) => {
    await page.notebook.setCell(0, 'code', shadowDOMOutput);
    await page.notebook.addCell('code', '1 + 1');
    await page.notebook.addCell('code', '2 + 2');

    await page.notebook.runCell(0);

    const firstCell = await page.notebook.getCellLocator(0);
    const secondCell = await page.notebook.getCellLocator(1);
    const thirdCell = await page.notebook.getCellLocator(2);
    await firstCell!.locator('#shadow-host').waitFor();

    // Make the last cell active, see the markdown test above.
    await thirdCell!.locator('.jp-InputArea-prompt').click();

    await selectText(page, '#shadow-host', 'beta', true);

    // Shift-click a later paragraph inside the SAME shadow root.
    await firstCell!.locator('#shadow-second').click({ modifiers: ['Shift'] });

    // See the markdown test above on why the in-between cells are checked.
    await expect(secondCell!).not.toHaveClass(/jp-mod-selected/);
    await expect(thirdCell!).not.toHaveClass(/jp-mod-selected/);
    expect(
      await page.evaluate(() => window.getSelection()?.toString() ?? '')
    ).toContain('delta');
  });

  test('Shift-click extends text selection across the outputs of two cells', async ({
    page
  }) => {
    await page.notebook.setCell(0, 'code', 'print("alpha")');
    await page.notebook.addCell('code', 'print("beta")');
    await page.notebook.addCell('code', 'print("gamma")');
    for (const index of [0, 1, 2]) {
      await page.notebook.runCell(index);
    }

    const firstCell = await page.notebook.getCellLocator(0);
    const secondCell = await page.notebook.getCellLocator(1);
    const thirdCell = await page.notebook.getCellLocator(2);
    await thirdCell!.locator('.jp-OutputArea-output').waitFor();

    // Make the first cell active, so that extending the cell selection to the
    // third cell would visibly select the cells below it.
    await firstCell!.locator('.jp-InputArea-prompt').click();

    await selectText(page, '.jp-Cell-outputArea', 'alpha');

    // Shift-click in the output of a *different* cell.
    await thirdCell!
      .locator('.jp-OutputArea-output')
      .click({ modifiers: ['Shift'] });

    // The browser extends the text selection over the cell in between instead
    // of the notebook selecting the cells. The clicked cell becomes active
    // (and thus `jp-mod-selected`) because it takes focus, so the cell where
    // the selection started and the cell in between are what tell a cell range
    // selection apart from a text selection here.
    await expect(firstCell!).not.toHaveClass(/jp-mod-selected/);
    await expect(secondCell!).not.toHaveClass(/jp-mod-selected/);
    expect(
      await page.evaluate(() => window.getSelection()?.toString() ?? '')
    ).toContain('gamma');
  });

  test('Shift-click extends text selection across two rendered markdown cells', async ({
    page
  }) => {
    await page.notebook.setCell(0, 'markdown', 'alpha beta gamma');
    await page.notebook.addCell('code', '1 + 1');
    await page.notebook.addCell('markdown', 'delta epsilon zeta');

    // Render both markdown cells.
    await page.notebook.runCell(0);
    await page.notebook.runCell(2);

    const firstCell = await page.notebook.getCellLocator(0);
    const secondCell = await page.notebook.getCellLocator(1);
    const thirdCell = await page.notebook.getCellLocator(2);
    await firstCell!.locator('.jp-MarkdownOutput').waitFor();
    await thirdCell!.locator('.jp-MarkdownOutput').waitFor();

    // Make the first cell active, so that extending the cell selection to the
    // third cell would visibly select the cells below it.
    await firstCell!.locator('.jp-InputArea-prompt').click();

    await selectText(page, '.jp-MarkdownOutput', 'beta');

    // Shift-click the rendered input of a *different* markdown cell.
    await thirdCell!
      .locator('.jp-MarkdownOutput p')
      .click({ modifiers: ['Shift'] });

    // See the test above on why the cell where the selection started and the
    // cell in between are the ones checked.
    await expect(firstCell!).not.toHaveClass(/jp-mod-selected/);
    await expect(secondCell!).not.toHaveClass(/jp-mod-selected/);
    expect(
      await page.evaluate(() => window.getSelection()?.toString() ?? '')
    ).toContain('delta');
  });

  test('Move cells up', async ({ page }) => {
    await populateNotebook(page);
    const imageName = 'move-cell-up.png';
    await page.notebook.selectCells(1);
    await page.menu.clickMenuItem('Edit>Move Cell Up');
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    // Here the toolbar should be hidden due to overlap with Markdown cell text
    await nbPanel!
      .locator('.jp-mod-active .jp-cell-toolbar')
      .waitFor({ state: 'hidden' });

    // Also wait for the heading collapser icon to appear
    await nbPanel!
      .locator('.jp-mod-active .jp-collapseHeadingButton')
      .waitFor();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Move cells down', async ({ page }) => {
    await populateNotebook(page);
    const imageName = 'move-cell-down.png';
    await page.notebook.selectCells(0);
    await page.menu.clickMenuItem('Edit>Move Cell Down');
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    await nbPanel!.locator('.jp-mod-active .jp-cell-toolbar').waitFor();
    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Split cell', async ({ page }) => {
    await populateNotebook(page);
    const imageName = 'split-cell.png';
    await page.notebook.enterCellEditingMode(2);
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.insertText('3 ** 2');
    await page.keyboard.press('Home');
    await page.menu.clickMenuItem('Edit>Split Cell');

    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    await nbPanel!.locator('.jp-mod-active .jp-cell-toolbar').waitFor();
    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Merge split cells', async ({ page }) => {
    await page.notebook.addCell('code', '2 ** 3');
    await page.notebook.addCell('code', '3 ** 2');

    const imageName = 'merge-cells.png';
    await page.notebook.selectCells(1, 2);
    await page.menu.clickMenuItem('Edit>Merge Selected Cells');
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    await nbPanel!.locator('.jp-mod-active .jp-cell-toolbar').waitFor();
    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });
});

test.describe('Notebook Edit (defer mode)', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(fileName);
  });

  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/notebook-extension:tracker': {
        ...galata.DEFAULT_SETTINGS['@jupyterlab/notebook-extension:tracker'],
        windowingMode: 'defer'
      }
    }
  });

  test('Data-windowing-index consistency on merge', async ({ page }) => {
    // Create 10 code cells with values 1 to 10
    await page.notebook.setCell(0, 'code', '1');
    for (let i = 2; i <= 10; i++) {
      await page.notebook.addCell('code', `${i}`);
    }

    // Get windowing indices before merge
    const indicesBeforeMerge = await getWindowingIndices(page);
    expect(indicesBeforeMerge.length).toBe(10);

    expect(verifyIncreasingByOne(indicesBeforeMerge)).toBeTruthy();

    // We will select cells 6, 5, 4 in that order (multi-select)
    const cell6 = await page.notebook.getCellLocator(6);

    // Start by selecting cell 6
    await cell6!.click();

    // Enter command mode
    await page.keyboard.press('Escape');

    // Select cell 5 and 4
    await page.keyboard.press('Shift+ArrowUp');
    await page.keyboard.press('Shift+ArrowUp');

    // Press M to merge
    await page.keyboard.press('Shift+KeyM');

    const indicesAfterMerge = await getWindowingIndices(page);
    expect(indicesAfterMerge.length).toBe(8);

    // Verify windowing indices increase by 1 after merge
    expect(verifyIncreasingByOne(indicesAfterMerge)).toBeTruthy();
  });
});

const getWindowingIndices = async (page: IJupyterLabPageFixture) => {
  const notebook = await page.notebook.getNotebookInPanelLocator();
  const cellElements = await notebook!
    .locator('[data-windowed-list-index]')
    .all();
  const indices: number[] = [];
  if (cellElements) {
    for (const element of cellElements) {
      const idx = await element.getAttribute('data-windowed-list-index');
      if (idx !== null) {
        indices.push(parseInt(idx, 10));
      }
    }
  }
  return indices;
};

const verifyIncreasingByOne = (indices: number[]) => {
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) {
      return false;
    }
  }
  return true;
};
