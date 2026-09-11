// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

const FILE_NAME = 'preview.md';

const FILE_CONTENT = `# Searching a preview

The word notebook appears twice in this paragraph, so notebook is here again.

- And notebook once more, in a list item.
`;

const SEARCH_TEXT = 'notebook';

// The counter reads "<current>/<total>", and the current index depends on
// whether a match is highlighted yet, so only the total is asserted.
const THREE_MATCHES = /\/3$/;

const counter = '.jp-DocumentSearch-index-counter';

test.beforeEach(async ({ page, tmpPath }) => {
  await page.contents.uploadContent(
    FILE_CONTENT,
    'text',
    `${tmpPath}/${FILE_NAME}`
  );
  await page.filebrowser.open(`${tmpPath}/${FILE_NAME}`, 'Markdown Preview');
  await page.locator('.jp-MarkdownViewer').waitFor();
  // Make sure the preview holds the focus, so that the shortcut reaches it.
  await page.activity.activateTab(FILE_NAME);
});

test('Search the rendered markdown', async ({ page }) => {
  await page.evaluate(async searchText => {
    await window.jupyterapp.commands.execute('documentsearch:start', {
      searchText
    });
  }, SEARCH_TEXT);

  await expect(page.getByPlaceholder('Find')).toHaveValue(SEARCH_TEXT);
  await expect(page.locator(counter)).toHaveText(THREE_MATCHES);
});

test('Populate search box with text selected in the preview', async ({
  page
}) => {
  // Select the first occurrence in the rendered markdown.
  await page.locator('.jp-MarkdownViewer').evaluate((element, searchText) => {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const start = node.textContent?.indexOf(searchText) ?? -1;
      if (start === -1) {
        continue;
      }
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, start + searchText.length);

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      break;
    }
  }, SEARCH_TEXT);

  await page.keyboard.press('Control+f');

  const searchInput = page.getByPlaceholder('Find');
  await expect(searchInput).toHaveValue(SEARCH_TEXT);
  await expect(searchInput).toBeFocused();
  await expect(page.locator(counter)).toHaveText(THREE_MATCHES);
});
