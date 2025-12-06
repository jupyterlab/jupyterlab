// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import * as path from 'path';
import { Locator } from '@playwright/test';

const fileName = 'mermaid_diagrams.ipynb';

test.use({
  mockSettings: {
    ...galata.DEFAULT_SETTINGS,
    '@jupyterlab/notebook-extension:tracker': {
      ...galata.DEFAULT_SETTINGS['@jupyterlab/notebook-extension:tracker'],
      // Do not use windowing as it simplifies the test as we do not
      // need to scroll the notebook before calling `output.waitFor()`.
      windowingMode: 'none'
    }
  }
});

// prefer appending to this list, as the index ends up being relevant
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
  'xy',
  'block',
  'kanban',
  'flowchart-elk',
  'architecture',
  'packet',
  'radar',
  'treemap'
];

// often have (potentially scroll-based) deltas
const PIXEL_DIFF_THRESHOLD: Record<string, number> = {
  architecture: 0.4,
  radar: 0.4,
  treemap: 0.4
};

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
  // Wait for next animation frame (next rendering cycle)
  await page.evaluate(() => {
    return new Promise<void>(resolve => {
      requestAnimationFrame(() => resolve());
    });
  });
  const screenshot = await locator.screenshot();
  await page.setViewportSize(originalSize);
  return screenshot;
}

for (const theme of ['default', 'dark']) {
  const dark = theme === 'dark';
  test.describe(`Notebook Mermaid Diagrams ${theme}`, () => {
    test.use({ tmpPath: 'test-mermaid' });

    test.beforeAll(async ({ request, tmpPath }) => {
      const contents = galata.newContentsHelper(request);
      await contents.uploadFile(
        path.resolve(__dirname, `./notebooks/${fileName}`),
        `${tmpPath}/${fileName}`
      );
    });

    test.beforeEach(async ({ page, tmpPath }) => {
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
          `mermaid-diagram-${theme}-${iZero}-${diagram}.png`,
          { threshold: PIXEL_DIFF_THRESHOLD[diagram] }
        );
      });
    }
  });
}
