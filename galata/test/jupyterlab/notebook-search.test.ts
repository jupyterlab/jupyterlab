// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { galata, test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import * as path from 'path';

const fileName = 'search.ipynb';

function getSelectionRange(textarea: HTMLTextAreaElement) {
  return {
    start: textarea.selectionStart,
    end: textarea.selectionEnd
  };
}

test.beforeEach(async ({ page, tmpPath }) => {
  await page.contents.uploadFile(
    path.resolve(__dirname, `./notebooks/${fileName}`),
    `${tmpPath}/${fileName}`
  );

  await page.notebook.openByPath(`${tmpPath}/${fileName}`);
  await page.notebook.activate(fileName);
});

test.afterEach(async ({ page, tmpPath }) => {
  await page.contents.deleteDirectory(tmpPath);
});

test.describe('Notebook Search', () => {
  test('Search', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.locator('text=1/21').waitFor();

    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot('search.png');
  });

  test('Should open search box in edit mode', async ({ page }) => {
    // Enter edit mode
    await page.notebook.enterCellEditingMode(0);

    await page.keyboard.press('Control+f');

    // Wait for the search box
    await page.getByPlaceholder('Find').waitFor();

    // Check the CM search panel is not displayed.
    await expect(page.locator('.cm-search.cm-panel')).toHaveCount(0);
  });

  test('Typing in search box', async ({ page }) => {
    // Check against React being too eager with controlling state of input box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', '14');
    await page.press('[placeholder="Find"]', 'ArrowLeft');
    await page.locator('[placeholder="Find"]').pressSequentially('2');
    await page.locator('[placeholder="Find"]').pressSequentially('3');

    await expect(page.locator('[placeholder="Find"]')).toHaveValue('1234');
  });

  test('Consecutive searches in the search box', async ({ page }) => {
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'jupyter');
    await page.keyboard.press('Control+f');
    await page.locator('[placeholder="Find"]').pressSequentially('jupyter');

    await expect(page.locator('[placeholder="Find"]')).toHaveValue('jupyter');
  });

  test('RegExp parsing failure', async ({ page }) => {
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'test\\');

    await page.click('button[title="Use Regular Expression"]');

    await expect(page.locator('.jp-DocumentSearch-regex-error')).toBeVisible();

    const overlay = page.locator('.jp-DocumentSearch-overlay');

    expect(await overlay.screenshot()).toMatchSnapshot(
      'regexp-parsing-failure.png'
    );
  });

  test('Multi-line search', async ({ page }) => {
    await page.keyboard.press('Control+f');

    await page.fill(
      '[placeholder="Find"]',
      'one notebook withr\n\n\nThis is a multi'
    );

    await page.locator('text=1/1').waitFor();

    // Show replace buttons to check for visual regressions
    await page.click('button[title="Show Replace"]');
    await page.fill('[placeholder="Replace"]', 'line1\nline2');

    const overlay = page.locator('.jp-DocumentSearch-overlay');
    expect(await overlay.screenshot()).toMatchSnapshot('multi-line-search.png');
  });

  test('Populate search box with selected text', async ({ page }) => {
    // Enter first cell
    await page.notebook.enterCellEditingMode(0);

    // Go to first line
    await page.keyboard.press('PageUp');
    // Select first line
    await page.keyboard.press('Shift+End');
    // Open search box
    await page.keyboard.press('Control+f');

    // Expect it to be populated with the first line
    const inputWithFirstLine = page.locator(
      '[placeholder="Find"] >> text="Test with one notebook withr"'
    );
    await expect(inputWithFirstLine).toBeVisible();
    await expect(inputWithFirstLine).toBeFocused();
    // Expect the newly set text to be selected
    expect(await inputWithFirstLine.evaluate(getSelectionRange)).toStrictEqual({
      start: 0,
      end: 28
    });

    // Expect the first match to be highlighted
    await page.locator('text=1/2').waitFor();

    // Enter first cell again
    await page.notebook.enterCellEditingMode(0);
    // Go to last line
    await page.keyboard.press('PageDown');
    // Select last line
    await page.keyboard.press('Shift+Home');
    // Update search box
    await page.keyboard.press('Control+f');

    // Expect it to be populated with the last line
    const inputWithLastLine = page.locator(
      '[placeholder="Find"] >> text="This is a multi line with hits with"'
    );
    await expect(inputWithLastLine).toBeVisible();
    await expect(inputWithLastLine).toBeFocused();
    // Expect the newly set text to be selected
    expect(await inputWithLastLine.evaluate(getSelectionRange)).toStrictEqual({
      start: 0,
      end: 35
    });

    await expect(page.locator('.jp-DocumentSearch-overlay')).toBeVisible();
  });

  test('Populate search box with text selected in rendered markdown', async ({
    page
  }) => {
    // Render the markdown cell to be able to select text from it.
    await page.notebook.runCell(1, true);
    const cell = await page.notebook.getCellLocator(1);

    await cell!.locator('.jp-MarkdownOutput').evaluate(element => {
      const textToSelect = 'notebook';
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent && node.textContent.includes(textToSelect)) {
          const startIndex = node.textContent.indexOf(textToSelect);
          const endIndex = startIndex + textToSelect.length;

          const range = document.createRange();
          range.setStart(node, startIndex);
          range.setEnd(node, endIndex);

          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
          break;
        }
      }
    });

    // Open the search box.
    await page.keyboard.press('Control+f');

    const searchInput = page.getByPlaceholder('Find');
    // Check if the search box is populated with the selected text.
    await expect(searchInput).toHaveValue('notebook');
    await expect(searchInput).toBeFocused();

    // Check that the search box content is selected.
    expect(await searchInput.evaluate(getSelectionRange)).toStrictEqual({
      start: 0,
      end: 'notebook'.length
    });

    // Expect that the search found a match.
    await page.locator('text=2/2').waitFor();
  });

  test('Restore previous search query if there is no selection', async ({
    page
  }) => {
    const inputWithTestLocator = page.locator(
      '[placeholder="Find"] >> text="test"'
    );
    const overlayLocator = page.locator('.jp-DocumentSearch-overlay');

    // Search for "test"
    await page.keyboard.press('Control+f');
    await page.fill('[placeholder="Find"]', 'test');
    await page.locator('text=1/2').waitFor();

    // Close search box
    await page.keyboard.press('Escape');
    await expect(overlayLocator).toBeHidden();

    // Open search box again
    await page.keyboard.press('Control+f');
    await expect(overlayLocator).toBeVisible();
    // Expect the text to be set in the input field
    await expect(inputWithTestLocator).toBeVisible();
    // Expect the search to be active again
    await page.locator('text=1/2').waitFor();
  });

  test('Clear search when box is empty', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    // Search for "test"
    await page.keyboard.press('Control+f');
    await page.fill('[placeholder="Find"]', 'test');

    // Should find "test" matches
    await page.locator('text=1/2').waitFor();
    await expect(page.locator('[placeholder="Find"]')).toHaveValue('test');

    // Remove the "test" query
    for (let i = 0; i < 4; i++) {
      await page.press('[placeholder="Find"]', 'Backspace');
    }
    await expect(page.locator('[placeholder="Find"]')).toHaveValue('');

    // Should reset the search to a clean state
    await page.locator('text=-/-').waitFor();
  });

  test('Close with Escape', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');
    await expect(page.locator('.jp-DocumentSearch-overlay')).toBeVisible();

    // Close search box
    await page.keyboard.press('Escape');
    await expect(page.locator('.jp-DocumentSearch-overlay')).toBeHidden();
  });

  test('Close with Escape from Notebook', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');
    await expect(page.locator('.jp-DocumentSearch-overlay')).toBeVisible();

    // Enter first cell
    await page.notebook.enterCellEditingMode(0);

    // First escape should NOT close the search box (but leave the editing mode)
    await page.keyboard.press('Escape');
    await page.getByText(`Mode: Command`, { exact: true }).waitFor();
    expect(await page.notebook.isCellInEditingMode(0)).toBeFalsy();
    await expect(page.locator('.jp-DocumentSearch-overlay')).toBeVisible();

    // Second escape should close the search box (even if it is not focused)
    await page.keyboard.press('Escape');
    await expect(page.locator('.jp-DocumentSearch-overlay')).toBeHidden();
  });

  test('Search within outputs', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.click('button[title="Show Search Filters"]');

    await page.click('text=Search Cell Outputs');

    // If the notebook is not fully loaded yet a confirmation dialog will show up
    if (await page.locator('.jp-Dialog').isVisible()) {
      await page.click('.jp-Dialog .jp-mod-accept');
    }

    await page.locator('text=1/29').waitFor();

    const cell = await page.notebook.getCellLocator(5);
    await cell!.scrollIntoViewIfNeeded();

    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(
      'search-within-outputs.png'
    );
  });

  test('Search in a single selected cell', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.click('button[title="Show Search Filters"]');

    await page.click('text=Search in 1 Selected Cell');

    await page.locator('text=1/4').waitFor();

    const nbPanel = await page.notebook.getNotebookInPanelLocator();
    expect(await nbPanel!.screenshot()).toMatchSnapshot(
      'search-in-selected-cells.png'
    );
  });

  test('Search in multiple selected cells', async ({ page }) => {
    await page.keyboard.press('Control+f');
    await page.fill('[placeholder="Find"]', 'with');
    await page.click('button[title="Show Search Filters"]');
    await page.click('text=Search in 1 Selected Cell');
    await page.locator('text=1/4').waitFor();

    // Bring focus to first cell without switching away from command mode
    let cell = await page.notebook.getCellLocator(0);
    await cell!.locator('.jp-InputPrompt').click();

    // Select three cells below
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Shift+ArrowDown');

    // Expect the filter text to be updated
    await page.locator('text=Search in 4 Selected Cells').waitFor();

    // Wait for the counter to reset to the first match in the selection.
    await page
      .locator('.jp-DocumentSearch-index-counter:has-text("1/19")')
      .waitFor({ timeout: 10000 });

    // Reset selection, switch to a middle cell, preserving command mode.
    cell = await page.notebook.getCellLocator(2);
    await cell!.locator('.jp-InputPrompt').click();

    await page.locator('text=Search in 1 Selected Cell').waitFor();
    // Wait for the counter to be properly updated
    await page
      .locator('.jp-DocumentSearch-index-counter:has-text("1/10")')
      .waitFor({ timeout: 10000 });

    // Select cell above
    await page.keyboard.press('Shift+ArrowUp');

    // Expect updated text
    await page.locator('text=Search in 2 Selected Cells').waitFor();

    // Expect 15 matches; this is 6/15, not 1/15 because current match is set
    // in second cell and when selection is extended, it does not move; keeping
    // the current match when extending the selection is desired as user may use
    // it as a reference, especially when it was set as closest to the cursor.
    await page.locator('text=6/15').waitFor();

    const nbPanel = await page.notebook.getNotebookInPanelLocator();
    expect(await nbPanel!.screenshot()).toMatchSnapshot(
      'search-in-two-selected-cells.png'
    );
  });

  test('Search in multiple selected cells from edit mode', async ({ page }) => {
    // This is testing focus handling when extending the selection after
    // switching focus away from cell editor, which needs to protect against
    // race conditions and CodeMirror6 focus issues when highlights get added.
    await page.keyboard.press('Control+f');
    await page.fill('[placeholder="Find"]', 'with');
    await page.click('button[title="Show Search Filters"]');
    await page.click('text=Search in 1 Selected Cell');
    await page.locator('text=1/4').waitFor();

    // Bring focus to first cell without switching to edit mode
    let cell = await page.notebook.getCellLocator(0);
    await cell!.locator('.jp-Editor').click();

    // Switch back to command mode
    await page.keyboard.press('Escape');
    await page.getByText(`Mode: Command`, { exact: true }).waitFor();

    // Select two cells below
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Shift+ArrowDown');

    // Expect the filter text to be updated
    await page.locator('text=Search in 3 Selected Cells').waitFor();

    // Expect 19 matches
    await page.locator('text=1/19').waitFor();
  });

  test('Search in selected text', async ({ page }) => {
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'text/');
    await page.locator('text=1/3').waitFor();

    // Activate third cell
    const cell = await page.notebook.getCellLocator(2);
    await cell!.locator('.jp-Editor').click();

    // Select 7 lines
    await page.keyboard.press('Control+Home');
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Shift+ArrowDown');
    }

    // Switch to selection search mode
    await page.click('button[title="Show Search Filters"]');
    await page.click('text=Search in 7 Selected Lines');

    await page.locator('text=1/2').waitFor();

    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(
      'search-in-selected-text.png'
    );
  });

  test('Highlights are visible when text is selected', async ({ page }) => {
    await page.keyboard.press('Control+f');
    await page.fill('[placeholder="Find"]', 'with');
    await page.locator('text=1/21').waitFor();

    const cell = await page.notebook.getCellLocator(0);
    await cell!.locator('.jp-Editor').click();

    // Select text (to see if the highlights will still be visible)
    await page.keyboard.press('Control+A');

    expect(await cell!.locator('.jp-Editor').screenshot()).toMatchSnapshot(
      'highlight-visible-under-selection.png'
    );
  });

  test('Highlight next hit same editor', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.locator('text=1/21').waitFor();

    // Click next button
    await page.click('button[title^="Next Match"]');

    const cell = await page.notebook.getCellLocator(0);

    expect(await cell!.locator('.jp-Editor').screenshot()).toMatchSnapshot(
      'highlight-next-in-editor.png'
    );
  });

  test('Highlight next hit in the next cell', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.locator('text=1/21').waitFor();

    // Click next button
    await page.click('button[title^="Next Match"]', {
      clickCount: 4
    });

    const cell = await page.notebook.getCellLocator(1);

    expect(await cell!.screenshot()).toMatchSnapshot('highlight-next-cell.png');
  });

  test('Highlight previous hit', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.locator('text=1/21').waitFor();

    // Click previous button
    await page.click('button[title^="Previous Match"]');
    // Should cycle back
    await page.locator('text=21/21').waitFor();

    // Click previous button twice
    await page.click('button[title^="Previous Match"]');
    await page.click('button[title^="Previous Match"]');
    // Should move up by two
    await page.locator('text=19/21').waitFor();

    const hit = await page.notebook.getCellLocator(2);
    expect(await hit!.screenshot()).toMatchSnapshot(
      'highlight-previous-element.png'
    );
  });

  test('Search from cursor', async ({ page }) => {
    const cell = await page.notebook.getCellLocator(5);
    await cell!.click();
    await page.keyboard.press('Escape');
    await cell!.scrollIntoViewIfNeeded();

    // Open search box
    await page.keyboard.press('Control+f');
    await page.fill('[placeholder="Find"]', 'with');
    await page.locator('text=20/21').waitFor();

    // Click previous button
    await page.click('button[title^="Previous Match"]');
    await page.locator('text=19/21').waitFor();
  });

  test('Highlight on markdown rendered state change', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.locator('text=1/21').waitFor();

    // Click next button
    await page.click('button[title^="Next Match"]', {
      clickCount: 4
    });

    const cell = await page.notebook.getCellLocator(1);

    await cell!.dblclick();

    expect(await cell!.locator('.jp-Editor').screenshot()).toMatchSnapshot(
      'highlight-markdown-switch-state.png'
    );
  });

  test('Scroll to the next match in rendered Markdown above another panel', async ({
    page,
    tmpPath
  }) => {
    const paragraphs = Array.from(
      { length: 30 },
      (_, i) => `Paragraph ${i + 1} mentions an apple.\n\n`
    );
    const notebook = galata.Notebook.generateNotebook(
      1,
      'markdown',
      paragraphs
    );
    await page.contents.uploadContent(
      JSON.stringify(notebook),
      'text',
      `${tmpPath}/apples.ipynb`
    );
    await page.contents.uploadContent('', 'text', `${tmpPath}/notes.txt`);
    await page.notebook.openByPath(`${tmpPath}/apples.ipynb`);
    // A console opened for the notebook takes the same place
    await page.evaluate(async path => {
      await window.jupyterapp.commands.execute('docmanager:open', {
        path,
        options: { mode: 'split-bottom' }
      });
    }, `${tmpPath}/notes.txt`);
    await page.notebook.activate('apples.ipynb');

    await page.keyboard.press('Control+f');
    await page.fill('[placeholder="Find"]', 'apple');
    const counter = page.locator('.jp-DocumentSearch-index-counter');
    await expect(counter).toHaveText('1/30');
    for (let match = 2; match <= 12; match++) {
      await page.keyboard.press('Enter');
      await expect(counter).toHaveText(`${match}/30`);
    }

    await expect(
      page.locator('.jp-RenderedMarkdown .jp-current-match')
    ).toBeInViewport({ ratio: 1 });
  });

  test('Mark the first match of a read-only cell after the query changes', async ({
    page,
    tmpPath
  }) => {
    const notebook = galata.Notebook.generateNotebook(1, 'markdown', [
      '## Shopping list\n\n',
      'See the [list methods](https://docs.python.org/3/tutorial/datastructures.html#more-on-lists).'
    ]);
    notebook.cells[0].metadata.editable = false;
    await page.contents.uploadContent(
      JSON.stringify(notebook),
      'text',
      `${tmpPath}/list.ipynb`
    );
    await page.notebook.openByPath(`${tmpPath}/list.ipynb`);
    await page.notebook.activate('list.ipynb');

    const cell = await page.notebook.getCellLocator(0);

    await page.keyboard.press('Control+f');
    await page.fill('[placeholder="Find"]', 'list');
    const counter = page.locator('.jp-DocumentSearch-index-counter');
    await expect(counter).toHaveText('1/3');
    await page.keyboard.press('Enter');
    await expect(counter).toHaveText('2/3');
    // The third match is in the link URL: the cell shows its editor
    await page.keyboard.press('Enter');
    await expect(counter).toHaveText('3/3');
    await expect(cell!.locator('.jp-InputArea-editor')).toBeVisible();

    // The search starts again and the cell renders again
    await page.locator('[placeholder="Find"]').press('Backspace');
    await expect(counter).toHaveText('1/3');
    await expect(
      cell!.locator('.jp-RenderedMarkdown .jp-current-match')
    ).toHaveText('lis');
  });

  for (const { cellType, where, currentMatch } of [
    {
      cellType: 'markdown',
      where: 'rendered Markdown',
      currentMatch: '.jp-RenderedMarkdown .jp-current-match'
    },
    {
      cellType: 'code',
      where: 'a code cell',
      currentMatch: '.jp-CodeCell .jp-current-match'
    }
  ] as const) {
    test(`Scroll to the first match in ${where} when typing a query`, async ({
      page,
      tmpPath
    }) => {
      const notebook = galata.Notebook.generateNotebook(40, cellType, [
        'Only hay here.'
      ]);
      notebook.cells[30].source = ['The needle is here.'];
      await page.contents.uploadContent(
        JSON.stringify(notebook),
        'text',
        `${tmpPath}/haystack.ipynb`
      );
      await page.notebook.openByPath(`${tmpPath}/haystack.ipynb`);
      await page.notebook.activate('haystack.ipynb');

      await page.keyboard.press('Control+f');
      await page.fill('[placeholder="Find"]', 'needle');

      await expect(page.locator('.jp-DocumentSearch-index-counter')).toHaveText(
        '1/1'
      );
      await expect(page.locator(currentMatch)).toBeInViewport({ ratio: 1 });
    });

    test(`Keep the scroll position when the search restarts after a cell is added, with a match in ${where}`, async ({
      page,
      tmpPath
    }) => {
      const notebook = galata.Notebook.generateNotebook(40, cellType, [
        'Only hay here.'
      ]);
      notebook.cells[30].source = ['The needle is here.'];
      await page.contents.uploadContent(
        JSON.stringify(notebook),
        'text',
        `${tmpPath}/haystack.ipynb`
      );
      await page.notebook.openByPath(`${tmpPath}/haystack.ipynb`);
      await page.notebook.activate('haystack.ipynb');

      await page.keyboard.press('Control+f');
      await page.fill('[placeholder="Find"]', 'needle');
      await expect(page.locator('.jp-DocumentSearch-index-counter')).toHaveText(
        '1/1'
      );

      const firstCell = (await page.notebook.getCellLocator(0))!;
      await (await page.notebook.getNotebookInPanelLocator())!.hover();
      await page.mouse.wheel(0, -10000);
      await expect(firstCell).toBeInViewport();

      const mark = page.locator(currentMatch);
      const previousMark = await mark.elementHandle();
      await firstCell.locator('.jp-InputPrompt').click();
      await page.keyboard.press('b');
      // The search starts again and marks the match anew
      await page.waitForFunction(
        element => !element?.isConnected,
        previousMark
      );
      await expect(mark).toHaveCount(1);

      await expect(firstCell).toBeInViewport();
    });
  }

  test('Keep the scroll position when the search restarts after a cell is added, with a match in an output', async ({
    page,
    tmpPath
  }) => {
    const notebook = galata.Notebook.generateNotebook(
      40,
      'code',
      ['print("hay")'],
      [{ output_type: 'stream', name: 'stdout', text: ['Only hay here.\n'] }]
    );
    notebook.cells[30].outputs = [
      { output_type: 'stream', name: 'stdout', text: ['The needle is here.\n'] }
    ];
    await page.contents.uploadContent(
      JSON.stringify(notebook),
      'text',
      `${tmpPath}/haystack.ipynb`
    );
    await page.notebook.openByPath(`${tmpPath}/haystack.ipynb`);
    await page.notebook.activate('haystack.ipynb');

    await page.keyboard.press('Control+f');
    await page.click('button[title="Show Search Filters"]');
    await page.click('text=Search Cell Outputs');
    // If the notebook is not fully loaded yet a confirmation dialog will show up
    if (await page.locator('.jp-Dialog').isVisible()) {
      await page.click('.jp-Dialog .jp-mod-accept');
    }
    await page.fill('[placeholder="Find"]', 'needle');
    await expect(page.locator('.jp-DocumentSearch-index-counter')).toHaveText(
      '1/1'
    );

    const firstCell = (await page.notebook.getCellLocator(0))!;
    await (await page.notebook.getNotebookInPanelLocator())!.hover();
    await page.mouse.wheel(0, -10000);
    await expect(firstCell).toBeInViewport();

    const mark = page.locator('.jp-OutputArea .jp-current-match');
    const previousMark = await mark.elementHandle();
    await firstCell.locator('.jp-InputPrompt').click();
    await page.keyboard.press('b');
    // The search starts again and marks the match anew
    await page.waitForFunction(element => !element?.isConnected, previousMark);
    await expect(mark).toHaveCount(1);

    await expect(firstCell).toBeInViewport();
  });

  test('Search on typing', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    // Wait until search has settled before entering a cell for edition
    // as this can lead to selection of active result near that cell
    // (rather than at the beginning of the notebook)
    await page.locator('text=1/21').waitFor();

    await page.notebook.setCell(5, 'code', 'with');

    const cell = await page.notebook.getCellLocator(5);
    expect(await cell!.screenshot()).toMatchSnapshot('search-typing.png');
  });

  test('Search new outputs', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.click('button[title="Show Search Filters"]');

    await page.click('text=Search Cell Outputs');

    // If the notebook is not fully loaded yet a confirmation dialog will show up
    if (await page.locator('.jp-Dialog').isVisible()) {
      await page.click('.jp-Dialog .jp-mod-accept');
    }

    await page.locator('text=1/29').waitFor();

    const cell = await page.notebook.getCellLocator(5);

    await cell!.click();

    await page.notebook.runCell(5);
    expect(await cell!.screenshot()).toMatchSnapshot('search-new-outputs.png');
  });

  test('Search on new cell', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.locator('text=1/21').waitFor();

    const cell = await page.notebook.getCellLocator(5);
    await cell!.click();
    await page.notebook.clickToolbarItem('insert');
    await page.notebook.setCell(6, 'code', 'with');

    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(
      'search-on-new-cell.png'
    );
  });

  test('Search on deleted cell', async ({ page, browserName }) => {
    test.skip(browserName === 'firefox', 'Flaky on Firefox');
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.locator('text=1/21').waitFor();

    const cell = await page.notebook.getCellLocator(5);
    await cell!.click();
    await page.keyboard.press('Escape');
    await cell!.scrollIntoViewIfNeeded();

    await page.keyboard.press('d');
    await page.keyboard.press('d');

    await page.locator('text=1/19').waitFor();

    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(
      'search-on-deleted-cell.png'
    );
  });

  test('Toggle search in selection with shortcut', async ({ page }) => {
    const filterCheckbox = page.getByLabel('Search in 1 Selected Cell');
    // Open search box and show filters
    await page.keyboard.press('Control+f');
    await page.click('button[title="Show Search Filters"]');
    await expect(filterCheckbox).not.toBeChecked();
    // Toggle search in selection on
    await page.keyboard.press('Alt+l');
    await expect(filterCheckbox).toBeChecked();
    // Toggle search in selection off
    await page.keyboard.press('Alt+l');
    await expect(filterCheckbox).not.toBeChecked();
  });

  test('Show shortcuts in tooltips', async ({ page }) => {
    // Open search box and show filters
    await page.keyboard.press('Control+f');
    await page.click('button[title="Show Search Filters"]');

    await expect(
      page.locator('button[title="Next Match (Ctrl+G)"]')
    ).toHaveCount(1);
    await expect(
      page.locator('button[title="Previous Match (Ctrl+Shift+G)"]')
    ).toHaveCount(1);
    await expect(
      page.locator(
        'label[title="Search only in the selected cells or text (depending on edit/command mode). (Alt+L)"]'
      )
    ).toHaveCount(1);
  });
});

test.describe('Auto search in multiple selection', async () => {
  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/documentsearch-extension:plugin': {
        autoSearchInSelection: 'multiple-selected'
      }
    }
  });

  test('Toggles search in cell selection', async ({ page }) => {
    // Bring focus to first cell without switching away from command mode
    let cell = await page.notebook.getCellLocator(0);
    await cell!.locator('.jp-InputPrompt').click();
    // Open search box and show filters
    await page.keyboard.press('Control+f');
    await page.click('button[title="Show Search Filters"]');
    // Expect search in selection to be disabled when only 1 cell is selected
    await expect(
      page.getByLabel('Search in 1 Selected Cell')
    ).not.toBeChecked();
    // Close search box
    await page.keyboard.press('Escape');

    // Select a cell below
    await page.keyboard.press('Shift+ArrowDown');
    // Open search box (filters should already be shown)
    await page.keyboard.press('Control+f');
    // Expect search in selection to be enabled since 2 cells are selected
    await expect(page.getByLabel('Search in 2 Selected Cells')).toBeChecked();
  });

  test('Toggles search in line selection', async ({ page }) => {
    // Activate third cell
    const cell = await page.notebook.getCellLocator(2);
    const editor = cell!.locator('.jp-Editor');
    await editor.click();

    // Select 1st line
    await page.keyboard.press('Control+Home');
    await page.keyboard.press('Shift+End');

    // Open search box and show filters
    await page.keyboard.press('Control+f');
    await page.click('button[title="Show Search Filters"]');
    // Expect search in selection to be disabled when only 1 cell is selected
    // As only one line is selected, the filter proposes to search in the cell.
    await expect(
      page.getByLabel('Search in 1 Selected Cell')
    ).not.toBeChecked();

    // Select 1st and 2nd line
    await editor.click();
    await page.keyboard.press('Control+Home');
    await page.keyboard.press('Shift+End');
    await page.keyboard.press('Shift+ArrowDown');
    // Open search box (filters should already be shown)
    await page.keyboard.press('Control+f');
    // Expect search in selection to be enabled since 2 lines are selected
    await expect(page.getByLabel('Search in 2 Selected Lines')).toBeChecked();
  });
});

test.describe('Auto search in any selection', async () => {
  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/documentsearch-extension:plugin': {
        autoSearchInSelection: 'any-selected'
      }
    }
  });

  test('Toggles search in cell selection', async ({ page }) => {
    // Bring focus to first cell without switching away from command mode
    let cell = await page.notebook.getCellLocator(0);
    await cell!.locator('.jp-InputPrompt').click();
    // Open search box and show filters
    await page.keyboard.press('Control+f');
    await page.click('button[title="Show Search Filters"]');
    // Expect search in selection to be disabled as while there is an >active<
    // cell, no cells are >selected<; the label is not ideal but it may be
    // preferred as-is for consistency.
    await expect(
      page.getByLabel('Search in 1 Selected Cell')
    ).not.toBeChecked();
  });

  test('Toggles search in line selection', async ({ page }) => {
    // Activate third cell
    const cell = await page.notebook.getCellLocator(2);
    const editor = cell!.locator('.jp-Editor');
    await editor.click();

    // Open search box and show filters
    await page.keyboard.press('Control+f');
    await page.click('button[title="Show Search Filters"]');
    // Expect search in selection to be disabled as no character is selected.
    await expect(
      page.getByLabel('Search in 1 Selected Cell')
    ).not.toBeChecked();

    // Select 1st line
    await editor.click();
    await page.keyboard.press('Control+Home');
    await page.keyboard.press('Shift+End');

    // Open search box (filters should already be shown)
    await page.keyboard.press('Control+f');
    // Expect search in selection to be enabled as 1 line is selected.
    await expect(page.getByLabel('Search in 1 Selected Line')).toBeChecked();
  });
});

test.describe('Search from selection', () => {
  test('should expand the selection to the next occurrence', async ({
    page
  }) => {
    // This could be improved as the following statement will double click
    // on the last line within the first cell that will result in the last word being selected.
    await page.getByRole('textbox').getByText('with').nth(1).dblclick();

    await page.keyboard.press('Control+Shift+d');

    await expect(
      page.getByRole('main').locator('.cm-selectionBackground')
    ).toHaveCount(2);
  });

  test('should expand the selection to all occurrences', async ({ page }) => {
    // This could be improved as the following statement will double click
    // on the last line within the first cell that will result in the last word being selected.
    await page.getByRole('textbox').getByText('with').nth(1).dblclick();

    await page.keyboard.press('Control+Shift+l');

    // Switch back to notebook
    // FIXME it should not be needed when we get https://github.com/jupyterlab/lumino/pull/662
    await page.activity.activateTab(fileName);

    await expect(
      page.getByRole('main').locator('.cm-selectionBackground')
    ).toHaveCount(4);
  });
});
