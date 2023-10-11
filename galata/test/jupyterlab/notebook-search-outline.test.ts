// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { expect, galata, test } from '@jupyterlab/galata';
import * as path from 'path';

const TEST_FILENAME = 'search_outline_notebook.ipynb';
const TEST_NEEDLE = 'come';

test.use({ tmpPath: 'test-search' });

function getSelectionRange(textarea: HTMLTextAreaElement) {
  return {
    start: textarea.selectionStart,
    end: textarea.selectionEnd
  };
}

test.beforeAll(async ({ request, tmpPath }) => {
  const contents = galata.newContentsHelper(request);
  await contents.uploadFile(
    path.resolve(__dirname, `./notebooks/${TEST_FILENAME}`),
    `${tmpPath}/${TEST_FILENAME}`
  );
});

test.beforeEach(async ({ page, tmpPath }) => {
  await page.notebook.openByPath(`${tmpPath}/${TEST_FILENAME}`);
  await page.notebook.activate(TEST_FILENAME);
});

test('Open and close Search dialog, then add new code cell', async ({
  page
}) => {
  const imageName1 = 'notebook-search-outline-1.png';
  const imageName2 = 'notebook-search-outline-2.png';

  // search for our needle
  await page.evaluate(async searchText => {
    await window.jupyterapp.commands.execute('documentsearch:start', {
      searchText
    });
  }, TEST_NEEDLE);

  // wait for the search to complete
  await page.waitForSelector('text=1/21');
  await page.locator('[placeholder="Find"]');

  // cancel search
  await page.keyboard.press('Escape');

  // expect the outlining to have gone
  const tabHandle = await page.activity.getPanel(TEST_FILENAME);
  expect(await tabHandle.screenshot()).toMatchSnapshot(imageName1);

  // insert a new code cell
  await page.evaluate(async () =>
    window.jupyterapp.commands.execute('notebook:insert-cell-below')
  );

  // wait an arbitrary amount of extra time
  // and expect the outlining to be still gone
  // but because of #14871, text is outlined again
  setTimeout(async () => {
    expect(await tabHandle.screenshot()).toMatchSnapshot(imageName2);
  }, 1000);
});
