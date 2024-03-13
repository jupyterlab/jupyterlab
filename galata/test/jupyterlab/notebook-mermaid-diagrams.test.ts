// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import * as path from 'path';
import { Locator } from '@playwright/test';

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

/**
 * Workaround for playwright not handling screenshots
 * for elements larger than viewport, derived from:
 * https://github.com/microsoft/playwright/issues/13486#issuecomment-1112012053
 */
async function resizePageAndScreenshot(locator: Locator) {
  const page = locator.page();
  const box = await locator.boundingBox();
  const originalSize = page.viewportSize();
  if (box.width > originalSize.width || box.height > originalSize.height) {
    const scaleFactor = Math.max(
      originalSize.width / box.width,
      originalSize.height / box.height
    );
    await page.setViewportSize({
      width: Math.ceil(box.width * scaleFactor),
      height: Math.ceil(box.height * scaleFactor)
    });
  }
  const screenshot = await locator.screenshot();
  await page.setViewportSize(originalSize);
  return screenshot;
}

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
        const output = page.locator(
          `.jp-Cell:nth-child(${i + 1}) .jp-RenderedMermaid`
        );
        await output.waitFor();

        expect(await resizePageAndScreenshot(output)).toMatchSnapshot(
          `mermaid-diagram-${theme}-${iZero}-${diagram}.png`
        );
      });
    }
  });
}
