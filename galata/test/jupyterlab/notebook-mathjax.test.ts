// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import type { Locator } from '@playwright/test';

const SHELL_PLUGIN = '@jupyterlab/application-extension:shell';

const fileName = 'math.ipynb';
const otherFileName = 'other.txt';

// The Markdown cell from #20286.
const CELL_SOURCE = [
  '## Sums and integrals\n',
  '\n',
  'Inline math $a^2 + b^2 = c^2$ and $\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}$.\n',
  '\n',
  '$$\n',
  '\\int_0^{1} x^2 \\, dx = \\frac{1}{3}\n',
  '$$\n'
];

/**
 * The inline font size MathJax sets on a `mjx-container` when it renders
 * without a layout box: MathJax falls back to `exFactor` (0.5) times the
 * font size, over the TeX font x-height (0.442 em).
 */
const FALLBACK_FONT_SIZE = '113.1%';

/**
 * The inline font sizes of the math in a notebook panel.
 */
async function mathFontSizes(panel: Locator): Promise<string[]> {
  return panel
    .locator('mjx-container')
    .evaluateAll(elements =>
      elements.map(element => (element as HTMLElement).style.fontSize)
    );
}

test.describe('Notebook MathJax in a background tab', () => {
  test.use({
    tmpPath: 'test-notebook-mathjax-hidden-tab',
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      [SHELL_PLUGIN]: {
        ...galata.DEFAULT_SETTINGS[SHELL_PLUGIN],
        hiddenMode: 'display'
      }
    }
  });

  test.beforeEach(async ({ page, tmpPath }) => {
    const notebook = galata.Notebook.generateNotebook(
      1,
      'markdown',
      CELL_SOURCE
    );
    await page.contents.uploadContent(
      JSON.stringify(notebook),
      'text',
      `${tmpPath}/${fileName}`
    );
    await page.contents.uploadContent(
      'Other file.\n',
      'text',
      `${tmpPath}/${otherFileName}`
    );
  });

  test.afterEach(async ({ page, tmpPath }) => {
    await page.contents.deleteDirectory(tmpPath);
  });

  test('Math rendered in a background tab is full size when the tab is shown', async ({
    page,
    tmpPath
  }) => {
    // Follow #20286: close everything, open the notebook first, then open
    // another file so the notebook becomes a background tab.
    await page.activity.closeAll();
    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    await page.notebook.activate(fileName);
    await page.filebrowser.open(`${tmpPath}/${otherFileName}`);
    expect(await page.notebook.isActive(fileName)).toBe(false);

    // Give the shell a moment to persist the layout before reloading, so
    // the notebook is restored into a background tab.
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(500);

    // Reload: the notebook is restored into a background tab and its math
    // is typeset while hidden.
    await page.reload({ waitForIsReady: false });
    await page.evaluate(() => window.jupyterapp.restored);
    await page.locator('#jupyterlab-splash').waitFor({ state: 'detached' });

    // Show the notebook tab; its math must now be typeset at full size.
    await page.notebook.activate(fileName);
    const panel = page
      .locator('[role="main"] .jp-NotebookPanel:visible')
      .first();
    await expect(panel.locator('mjx-container')).toHaveCount(3);
    const restoredSizes = await mathFontSizes(panel);
    expect(restoredSizes).toHaveLength(3);
    for (const size of restoredSizes) {
      expect(size).not.toBe(FALLBACK_FONT_SIZE);
    }

    // Open a new view of the notebook, which typesets while visible, and
    // compare: the issue reports the two views at different sizes.
    await page.evaluate(async () => {
      await window.jupyterapp.commands.execute('docmanager:clone');
    });
    const panels = page.locator('[role="main"] .jp-NotebookPanel:visible');
    await expect(panels).toHaveCount(2);
    const allSizes = await panels.evaluateAll(panels =>
      panels.flatMap(panel =>
        [...panel.querySelectorAll('mjx-container')].map(
          container => (container as HTMLElement).style.fontSize
        )
      )
    );
    expect(allSizes).toHaveLength(6);
    expect(new Set(allSizes).size).toBe(1);
    expect(allSizes[0]).not.toBe(FALLBACK_FONT_SIZE);
  });
});
