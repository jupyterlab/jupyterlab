// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { expect, galata, test } from '@jupyterlab/galata';
import * as path from 'path';

const TEST_FILENAME = 'search_highlight_notebook.ipynb';
const TEST_NEEDLE = 'come';

test.use({ tmpPath: 'test-search' });

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
  const imageNameBefore = 'notebook-no-search-highlight-before.png';
  const imageNameAfter = 'notebook-no-search-highlight-after.png';

  // search for our needle
  await page.evaluate(async searchText => {
    await window.jupyterapp.commands.execute('documentsearch:start', {
      searchText
    });
  }, TEST_NEEDLE);

  // wait for the search to complete
  await page.waitForSelector('text=1/21');

  // cancel search
  await page.keyboard.press('Escape');

  // expect the outlining to have gone
  const panel = await page.activity.getPanel(TEST_FILENAME);
  // get only the document node to avoid noise from kernel and debugger in the toolbar
  const notebook = await panel.$('.jp-Notebook');

  expect(await notebook.screenshot()).toMatchSnapshot(imageNameBefore);

  // insert a new code cell
  await page.evaluate(async () =>
    window.jupyterapp.commands.execute('notebook:insert-cell-below')
  );

  // wait an arbitrary amount of extra time
  // and expect the outlining to be still gone
  // but because of #14871, text is highlighted again
  await new Promise(resolve => setTimeout(resolve, 1000));
  expect(await notebook.screenshot()).toMatchSnapshot(imageNameAfter);
});
