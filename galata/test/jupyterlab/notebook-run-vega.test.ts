// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect,
  galata,
  IJupyterLabPageFixture,
  test
} from '@jupyterlab/galata';
import * as fs from 'fs';
import * as path from 'path';

const fileName = 'vega_notebook.ipynb';

const PNG_MIME_TYPE = 'image/png';

test.use({ tmpPath: 'notebook-run-vega-test' });

async function nbDiskContent(
  page: IJupyterLabPageFixture,
  nbPath: string
): Promise<string> {
  await page.notebook.save();
  return fs.readFileSync(nbPath).toString('utf8');
}

test.describe.serial('Notebook Run Vega', () => {
  test.beforeAll(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );
  });

  test.beforeEach(async ({ page, tmpPath }) => {
    await page.filebrowser.openDirectory(tmpPath);
  });

  test.afterAll(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.deleteDirectory(tmpPath);
  });

  test('Run notebook with Vega cell in default theme', async ({
    page,
    tmpPath
  }) => {
    const nbPath = `${tmpPath}/${fileName}`;
    await page.notebook.openByPath(nbPath);
    await page.notebook.activate(fileName);

    expect(await nbDiskContent(page, nbPath)).not.toContain(PNG_MIME_TYPE);

    const imageName = 'run-cells-vega.png';

    await page.notebook.run();
    await page.waitForSelector('.vega-embed');

    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(imageName);
    expect(await nbDiskContent(page, nbPath)).toContain(PNG_MIME_TYPE);
  });

  test('Run notebook with Vega cell in dark theme', async ({
    page,
    tmpPath
  }) => {
    const nbPath = `${tmpPath}/${fileName}`;
    await page.notebook.openByPath(nbPath);
    await page.notebook.activate(fileName);
    await page.theme.setDarkTheme();

    expect(await nbDiskContent(page, nbPath)).not.toContain(PNG_MIME_TYPE);

    const imageName = 'run-cells-dark-vega.png';

    await page.notebook.run();
    await page.waitForSelector('.vega-embed');

    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(imageName);
    expect(await nbDiskContent(page, nbPath)).toContain(PNG_MIME_TYPE);
  });
});
