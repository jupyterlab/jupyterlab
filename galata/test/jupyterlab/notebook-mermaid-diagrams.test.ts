// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import * as path from 'path';

const fileName = 'mermaid_diagrams.ipynb';

const EXPECTED_MERMAID_ORDER = [
  'flowchart',
  'sequence',
  'class',
  'state',
  'er',
  'journey',
  'gantt',
  'pie',
  'quadrant',
  'requirement',
  'c4',
  'mindmap',
  'timeline',
  'sankey',
  'xy'
];

for (const theme of ['default', 'dark']) {
  const dark = theme === 'dark';
  test.describe(`Notebook Mermaid Diagrams ${theme}`, () => {
    test.beforeEach(async ({ page, request, tmpPath }) => {
      const contents = galata.newContentsHelper(request);
      await contents.uploadFile(
        path.resolve(__dirname, `./notebooks/${fileName}`),
        `${tmpPath}/${fileName}`
      );
      await page.filebrowser.openDirectory(tmpPath);
      const nbPath = `${tmpPath}/${fileName}`;

      if (dark) {
        await page.theme.setDarkTheme();
      }

      await page.notebook.openByPath(nbPath);
      await page.notebook.activate(fileName);
    });

    for (let i = 0; i < EXPECTED_MERMAID_ORDER.length; i++) {
      let diagram = EXPECTED_MERMAID_ORDER[i];
      const iZero = `${i}`.padStart(2, '0');

      test(`Mermaid Diagram ${i} ${diagram} in ${theme} theme`, async ({
        page
      }) => {
        const output = await page.waitForSelector(
          `.jp-Cell:nth-child(${i + 1}) .jp-RenderedMermaid`
        );

        expect(await output.screenshot()).toMatchSnapshot(
          `mermaid-diagram-${theme}-${iZero}-${diagram}.png`
        );
      });
    }
  });
}
