// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import * as path from 'path';

const fileName = 'mermaid_diagrams.ipynb';

const CSS_CLASS_MMD = '.jp-RenderedMermaid';
const EXPECTED_MERMAID_COUNT = 16;

test.describe('Notebook Mermaid Diagrams', () => {
  test.beforeEach(async ({ page, request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );

    await page.filebrowser.openDirectory(tmpPath);
  });

  for (const theme of ['default', 'dark']) {
    const dark = theme == 'dark';

    test(`Mermaid Markdown diagrams in ${theme} theme`, async ({
      page,
      tmpPath
    }) => {
      const nbPath = `${tmpPath}/${fileName}`;

      if (dark) {
        await page.theme.setDarkTheme();
      }

      await page.notebook.openByPath(nbPath);
      await page.notebook.activate(fileName);

      await page.waitForSelector(CSS_CLASS_MMD);
      const outputs = await page.$$(CSS_CLASS_MMD);
      expect(outputs.length).toBe(EXPECTED_MERMAID_COUNT);

      for (let i = 0; i < outputs.length; i++) {
        const output = outputs[i];
        const iZero = `${i}`.padStart(2, '0');
        const imageName = `run-cells-mermaid-${theme}-${iZero}.png`;
        expect(await output.screenshot()).toMatchSnapshot(imageName);
      }
    });
  }
});
