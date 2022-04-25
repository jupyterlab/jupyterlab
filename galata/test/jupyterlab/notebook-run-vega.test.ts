// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import * as path from 'path';

const fileName = 'vega_notebook.ipynb';

test.use({ tmpPath: 'notebook-run-vega-test' });

test.describe.serial('Notebook Run Vega', () => {
  test.beforeAll(async ({ baseURL, tmpPath }) => {
    const contents = galata.newContentsHelper(baseURL);
    await contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );
  });

  test.beforeEach(async ({ page, tmpPath }) => {
    await page.filebrowser.openDirectory(tmpPath);
  });

  test.afterAll(async ({ baseURL, tmpPath }) => {
    const contents = galata.newContentsHelper(baseURL);
    await contents.deleteDirectory(tmpPath);
  });

  test('Run notebook with Vega cell in default theme', async ({
    page,
    tmpPath
  }) => {
    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    await page.notebook.activate(fileName);

    const imageName = 'run-cells-vega.png';

    await page.notebook.run();
    const graph = await page.waitForSelector('.vega-embed');

    expect(await graph.screenshot()).toMatchSnapshot(imageName);
  });

  test('Run notebook with Vega cell in dark theme', async ({
    page,
    tmpPath
  }) => {
    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    await page.notebook.activate(fileName);
    await page.theme.setDarkTheme();

    const imageName = 'run-cells-dark-vega.png';

    await page.notebook.run();
    const graph = await page.waitForSelector('.vega-embed');

    expect(await graph.screenshot()).toMatchSnapshot(imageName);
  });
});
