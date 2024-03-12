// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect,
  galata,
  IJupyterLabPageFixture,
  test
} from '@jupyterlab/galata';
import * as path from 'path';

const fileName = 'vega_notebook.ipynb';

const PNG_MIME_TYPE = 'image/png';

async function nbDiskContent(
  page: IJupyterLabPageFixture,
  nbPath: string
): Promise<string> {
  await page.notebook.save();
  // Use the `files` API as figure out the local path is though.
  const response = await page.request.fetch(`/files/${nbPath}`);
  if (!response.ok()) {
    return '';
  }
  const buffer = await response.body();
  return buffer.toString();
}

test.describe('Notebook Run Vega', () => {
  test.beforeEach(async ({ page, request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );

    await page.filebrowser.openDirectory(tmpPath);
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
    await page.locator('.vega-embed').waitFor();

    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
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
    await page.locator('.vega-embed').waitFor();

    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
    expect(await nbDiskContent(page, nbPath)).toContain(PNG_MIME_TYPE);
  });
});
