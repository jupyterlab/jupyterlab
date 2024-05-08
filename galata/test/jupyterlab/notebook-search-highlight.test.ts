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

const HIGHLIGHTS_LOCATOR = '.cm-searching';

test('Open and close Search dialog, then add new code cell', async ({
  page
}) => {
  // search for our needle
  await page.evaluate(async searchText => {
    await window.jupyterapp.commands.execute('documentsearch:start', {
      searchText
    });
  }, TEST_NEEDLE);

  // wait for the search to complete
  await page.locator('text=1/21').waitFor();
  expect(await page.locator(HIGHLIGHTS_LOCATOR).count()).toBeGreaterThanOrEqual(
    4
  );

  // cancel search
  await page.keyboard.press('Escape');

  // expect the highlights to have gone
  expect(await page.locator(HIGHLIGHTS_LOCATOR).count()).toEqual(0);

  // insert a new code cell
  await page.evaluate(async () =>
    window.jupyterapp.commands.execute('notebook:insert-cell-below')
  );

  // wait an arbitrary amount of extra time
  // and expect the highlights to be still gone
  // regression-testing against #14871
  await new Promise(resolve => setTimeout(resolve, 1000));
  expect(await page.locator(HIGHLIGHTS_LOCATOR).count()).toEqual(0);
});
