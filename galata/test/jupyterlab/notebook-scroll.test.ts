// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import type { Page } from '@playwright/test';
import * as path from 'path';

import {
  dragCellTo,
  notebookViewportRatio,
  positionCellPartiallyBelowViewport
} from './utils';

const fileName = 'scroll.ipynb';
const longOutputsNb = 'long_outputs.ipynb';

async function waitForNotebookLayout(page: Page): Promise<void> {
  await page.evaluate(() => {
    return new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  });
}

test.use({
  mockSettings: {
    ...galata.DEFAULT_SETTINGS,
    '@jupyterlab/notebook-extension:tracker': {
      ...galata.DEFAULT_SETTINGS['@jupyterlab/notebook-extension:tracker'],
      windowingMode: 'full'
    }
  }
});

test.describe('Notebook scroll on navigation (with windowing)', () => {
  test.beforeEach(async ({ page, tmpPath }) => {
    await page.contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );

    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    await page.notebook.activate(fileName);
  });

  test.afterEach(async ({ page, tmpPath }) => {
    await page.contents.deleteDirectory(tmpPath);
  });

  const cellLinks = {
    'penultimate cell using heading, legacy format': 18,
    'penultimate cell using heading, explicit fragment': 18,
    'last cell using heading, legacy format': 19,
    'last cell using heading, explicit fragment': 19,
    'last cell using cell identifier': 19
  };
  for (const [link, cellIdx] of Object.entries(cellLinks)) {
    test(`Scroll to ${link}`, async ({ page }) => {
      const firstCellLocator = page.locator(
        '.jp-Cell[data-windowed-list-index="0"]'
      );
      const lastCellLocator = page.locator(
        `.jp-Cell[data-windowed-list-index="${cellIdx}"]`
      );
      await firstCellLocator.scrollIntoViewIfNeeded();

      await page.click(`a:has-text("${link}")`);

      await expect(firstCellLocator).not.toBeInViewport();
      await expect(lastCellLocator).toBeInViewport();
    });
  }
});

test.describe('Notebook scroll on navigation (with windowing), named properties allowed', () => {
  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/notebook-extension:tracker': {
        ...galata.DEFAULT_SETTINGS['@jupyterlab/notebook-extension:tracker'],
        windowingMode: 'full'
      },
      '@jupyterlab/apputils-extension:sanitizer': {
        ...galata.DEFAULT_SETTINGS['@jupyterlab/apputils-extension:sanitizer'],
        allowNamedProperties: true
      }
    }
  });

  test.beforeEach(async ({ page, tmpPath }) => {
    await page.contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );

    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    await page.notebook.activate(fileName);
  });

  test.afterEach(async ({ page, tmpPath }) => {
    await page.contents.deleteDirectory(tmpPath);
  });

  const cellLinks = {
    'penultimate cell using heading, legacy format': 18,
    'penultimate cell using heading, explicit fragment': 18,
    'last cell using heading, legacy format': 19,
    'last cell using heading, explicit fragment': 19,
    'last cell using cell identifier': 19
  };
  for (const [link, cellIdx] of Object.entries(cellLinks)) {
    test(`Scroll to ${link}`, async ({ page }) => {
      const firstCellLocator = page.locator(
        '.jp-Cell[data-windowed-list-index="0"]'
      );
      const lastCellLocator = page.locator(
        `.jp-Cell[data-windowed-list-index="${cellIdx}"]`
      );
      await firstCellLocator.scrollIntoViewIfNeeded();

      await page.click(`a:has-text("${link}")`);

      await expect(firstCellLocator).not.toBeInViewport();
      await expect(lastCellLocator).toBeInViewport();
    });
  }
});

test.describe('Notebook scroll on navigation (content visibility)', () => {
  test.use({
    autoGoto: false,
    mockState: async ({ tmpPath }, use) => {
      const target = `notebook:${tmpPath}/target.ipynb`;
      const source = `notebook:${tmpPath}/links.ipynb`;
      await use({
        'layout-restorer:data': {
          main: {
            current: source,
            dock: {
              type: 'tab-area',
              currentIndex: 1,
              widgets: [target, source]
            }
          }
        },
        ...Object.fromEntries(
          [target, source].map(name => [
            name,
            {
              data: {
                path: name.slice('notebook:'.length),
                factory: 'Notebook',
                kernelPreference: { shouldStart: false }
              }
            }
          ])
        )
      });
    },
    waitForApplication: async ({ baseURL }, use) => {
      await use(async page => {
        await page.evaluate(async () => {
          await window.jupyterapp.restored;
        });
      });
    },
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/notebook-extension:tracker': {
        ...galata.DEFAULT_SETTINGS['@jupyterlab/notebook-extension:tracker'],
        windowingMode: 'contentVisibility'
      }
    }
  });

  for (const cellType of ['code', 'markdown'] as const) {
    test(`should follow a cell-id link to a ${cellType} cell in a restored background notebook on the first click`, async ({
      page,
      tmpPath
    }) => {
      const targetName = 'target.ipynb';
      const sourceName = 'links.ipynb';
      const cellCount = 50;
      const targetIndex = 40;
      const notebook = {
        nbformat: 4,
        nbformat_minor: 5,
        metadata: {}
      };
      await page.contents.uploadContent(
        JSON.stringify({
          ...notebook,
          cells: Array.from({ length: cellCount }, (_, index) => ({
            cell_type: cellType,
            id: `cell-${index}`,
            metadata: {},
            source:
              cellType === 'code'
                ? `# Cell ${index}\nvalue = ${index}\nprint(value)`
                : `## Cell ${index}\n\nContent of cell ${index}.`,
            ...(cellType === 'code'
              ? { execution_count: null, outputs: [] }
              : {})
          }))
        }),
        'text',
        `${tmpPath}/${targetName}`
      );
      await page.contents.uploadContent(
        JSON.stringify({
          ...notebook,
          cells: [
            {
              cell_type: 'markdown',
              id: 'link',
              metadata: {},
              source: `[Go to cell](${targetName}#cell-id=cell-${targetIndex})`
            }
          ]
        }),
        'text',
        `${tmpPath}/${sourceName}`
      );

      await page.goto();

      const targetNotebook = page.locator('.jp-NotebookPanel').filter({
        has: page.locator(`[data-windowed-list-index="${cellCount - 1}"]`)
      });
      await expect(
        targetNotebook.locator(
          cellType === 'code' ? '.cm-editor' : '.jp-MarkdownOutput'
        )
      ).toHaveCount(cellCount);
      expect(await page.activity.isTabActive(targetName)).toBe(false);

      await page.getByRole('link', { name: 'Go to cell' }).click();

      await expect.poll(() => page.activity.isTabActive(targetName)).toBe(true);
      await expect(
        targetNotebook.locator(`[data-windowed-list-index="${targetIndex}"]`)
      ).toBeInViewport({ ratio: 0.99 });
      // Cells measured while the notebook was hidden would keep a zero size.
      expect(
        await targetNotebook
          .locator('.jp-Cell')
          .evaluateAll(cells =>
            cells.map(cell => getComputedStyle(cell).containIntrinsicSize)
          )
      ).not.toContain('auto 0px');
    });
  }
});

for (const windowingMode of [
  'contentVisibility',
  'defer',
  'full',
  'none'
] as const) {
  test.describe(`Notebook heading links (${windowingMode} windowing)`, () => {
    test.use({
      mockSettings: {
        ...galata.DEFAULT_SETTINGS,
        '@jupyterlab/notebook-extension:tracker': {
          ...galata.DEFAULT_SETTINGS['@jupyterlab/notebook-extension:tracker'],
          windowingMode
        }
      }
    });

    test('should reach a heading of a closed notebook on the first click', async ({
      page,
      tmpPath
    }) => {
      const notebook = {
        nbformat: 4,
        nbformat_minor: 5,
        metadata: {
          kernelspec: { name: 'python3', display_name: 'Python 3' }
        }
      };
      const markdownCell = (id: string, source: string) => ({
        cell_type: 'markdown',
        id,
        metadata: {},
        source
      });
      await page.contents.uploadContent(
        JSON.stringify({
          ...notebook,
          cells: Array.from({ length: 40 }, (_, index) =>
            markdownCell(
              `cell-${index}`,
              index === 30
                ? '## Target section'
                : `Paragraph ${index}\n\n`.repeat(6)
            )
          )
        }),
        'text',
        `${tmpPath}/target.ipynb`
      );
      await page.contents.uploadContent(
        JSON.stringify({
          ...notebook,
          cells: [
            markdownCell('link', '[Go to section](target.ipynb#Target-section)')
          ]
        }),
        'text',
        `${tmpPath}/links.ipynb`
      );
      await page.notebook.openByPath(`${tmpPath}/links.ipynb`);

      await page.getByRole('link', { name: 'Go to section' }).click();

      await expect
        .poll(() => page.activity.isTabActive('target.ipynb'))
        .toBe(true);
      const heading = page.locator('h2', { hasText: 'Target section' });
      const panel = page.locator('.jp-NotebookPanel').filter({ has: heading });
      await expect(heading).toBeInViewport();
      // The heading must end up at the top of the notebook.
      await expect
        .poll(async () => {
          const list = await panel
            .locator('.jp-WindowedPanel-outer')
            .boundingBox();
          const box = await heading.boundingBox();
          return list && box ? Math.abs(box.y - list.y) < 50 : false;
        })
        .toBe(true);
    });
  });
}

test.describe('Notebook scroll on dragging cells (with windowing)', () => {
  test.beforeEach(async ({ page, tmpPath }) => {
    await page.contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );

    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    await page.notebook.activate(fileName);
  });
  const NOTEBOOK_SCROLLER = '.jp-WindowedPanel-outer';
  const NOTEBOOK_CONTENT = '.jp-WindowedPanel-inner';
  const EDGE_MARGIN = 10;

  test.afterEach(async ({ page, tmpPath }) => {
    await page.contents.deleteDirectory(tmpPath);
  });

  test('Scroll down on dragging cell to the bottom edge', async ({ page }) => {
    const firstCellLocator = page.locator(
      '.jp-Cell[data-windowed-list-index="0"]'
    );
    const lastCellLocator = page.locator(
      '.jp-Cell[data-windowed-list-index="19"]'
    );
    const scroller = page.locator(NOTEBOOK_SCROLLER);
    await firstCellLocator.scrollIntoViewIfNeeded();

    const scrollerBBox = (await scroller.boundingBox())!;
    const notebookContentHeight = (
      await page.locator(NOTEBOOK_CONTENT).boundingBox()
    ).height;

    // Ensure the notebook is scrolled correctly and last cell is not visible
    const before = await scroller.evaluate(node => node.scrollTop);
    expect(before).toBe(0);
    await expect(lastCellLocator).not.toBeInViewport();

    // Emulate drag and drop
    await dragCellTo(page, {
      cell: firstCellLocator,
      x: scrollerBBox.x + 0.5 * scrollerBBox.width,
      y: scrollerBBox.y + scrollerBBox.height - EDGE_MARGIN,
      stopCondition: async () => {
        const scrollTop = await scroller.evaluate(node => node.scrollTop);
        return scrollTop >= notebookContentHeight - 100;
      }
    });

    // The notebook should have scrolled down and the last cell should be visible
    const after = await scroller.evaluate(node => node.scrollTop);
    expect(after).toBeGreaterThan(before);
    await expect(lastCellLocator).toBeInViewport();
  });

  test('Scroll up on dragging cell to the top edge', async ({
    page,
    browserName
  }) => {
    const firstCellLocator = page.locator(
      '.jp-Cell[data-windowed-list-index="0"]'
    );
    const lastCellLocator = page.locator(
      '.jp-Cell[data-windowed-list-index="19"]'
    );

    const scroller = page.locator(NOTEBOOK_SCROLLER);
    const scrollerBBox = (await scroller.boundingBox())!;
    const notebookContentHeight = (
      await page.locator(NOTEBOOK_CONTENT).boundingBox()
    ).height;

    // Scroll notebook to the bottom, leaving top 200px visible
    await page.mouse.move(
      scrollerBBox.x + 0.5 * scrollerBBox.width,
      scrollerBBox.y + 0.5 * scrollerBBox.height
    );
    await page.mouse.wheel(0, notebookContentHeight - 200);
    await lastCellLocator.scrollIntoViewIfNeeded();

    // Ensure the notebook is scrolled correctly and first cell is not visible
    const before = await scroller.evaluate(node => node.scrollTop);
    const factor = browserName === 'firefox' ? 0.6 : 0.75;
    expect(before).toBeGreaterThan(notebookContentHeight * factor);
    await expect(firstCellLocator).not.toBeInViewport();

    // Emulate drag and drop
    await dragCellTo(page, {
      cell: lastCellLocator,
      x: scrollerBBox.x + 0.5 * scrollerBBox.width,
      y: scrollerBBox.y + EDGE_MARGIN,
      stopCondition: async () => {
        const scrollTop = await scroller.evaluate(node => node.scrollTop);
        return scrollTop <= 50;
      }
    });

    // The notebook should have scrolled up and the first cell should be visible
    const after = await scroller.evaluate(node => node.scrollTop);
    expect(after).toBeLessThan(before);
    await expect(firstCellLocator).toBeInViewport();
  });
});

test.describe('Notebook scroll on execution (with windowing)', () => {
  test.beforeEach(async ({ page, tmpPath }) => {
    await page.contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${longOutputsNb}`),
      `${tmpPath}/${longOutputsNb}`
    );

    await page.notebook.openByPath(`${tmpPath}/${longOutputsNb}`);
    await page.notebook.activate(longOutputsNb);
  });

  test.afterEach(async ({ page, tmpPath }) => {
    await page.contents.deleteDirectory(tmpPath);
  });

  test('should scroll when advancing if top is only marginally visible', async ({
    page
  }) => {
    const notebook = await page.notebook.getNotebookInPanelLocator();
    const thirdCell = await page.notebook.getCellLocator(2);

    // Set second cell to code without output to test advancement in isolation
    await page.notebook.setCell(1, 'code', '# test cell without output');
    await page.notebook.selectCells(1);
    await page.evaluate(() => {
      return window.jupyterapp.commands.execute('notebook:clear-cell-output');
    });
    await waitForNotebookLayout(page);

    // The cell should scroll if less than one line of code is visible,
    // this is the height of the top cell margin + editor line height,
    // so this number needs to less than that to count as "marginally
    // visible". It so happens that it is ~1% of this particular cell,
    // because it has 100 lines of output + 1 editor line and the output
    // lines are about the same height so 1% = ~1 line visible.
    await positionCellPartiallyBelowViewport(
      page,
      notebook!,
      thirdCell!,
      0.5 / 100
    );

    // The third cell should be positioned at the bottom, revealing between 0% to 1% of its content.
    await expect(thirdCell!).toBeInViewport({ ratio: 0 / 100 });
    await expect(thirdCell!).not.toBeInViewport({ ratio: 1 / 100 });

    // Only a small fraction of notebook viewport should be taken up by that cell
    expect(await notebookViewportRatio(notebook!, thirdCell!)).toBeLessThan(
      0.1
    );

    // Run second cell and advance to next cell
    await page.notebook.runCell(1, { inplace: false });

    // After running the second cell and advancing to the third cell, the third cell should be revealed, in at least 10%
    await expect(thirdCell!).toBeInViewport({ ratio: 0.1 });

    // The third cell should now occupy about half of the notebook viewport
    expect(await notebookViewportRatio(notebook!, thirdCell!)).toBeGreaterThan(
      0.4
    );
  });

  test('should keep active cell when a cell above generates a lot of output', async ({
    page
  }) => {
    const notebook = await page.notebook.getNotebookInPanelLocator();
    const thirdCell = await page.notebook.getCellLocator(2);

    // Set second cell to produce long output with delay to test active cell scroll anchoring
    await page.notebook.setCell(
      1,
      'code',
      // In the `full` windowing mode the anchoring will be in effect for 3 seconds
      // after the most recent scroll event. In other windowing modes the browser
      // will anchor the active cell at all times, without time limits.
      'from time import sleep\nsleep(2)\nfor i in range(100):\n    print(i)\n    sleep(0.05)\n'
    );

    // Clear output of the second cell
    await page.evaluate(() => {
      return window.jupyterapp.commands.execute('notebook:clear-cell-output');
    });
    await waitForNotebookLayout(page);

    // Select third cell to make sure it is visible
    await page.notebook.selectCells(2);

    // Clear output of the third cell
    await page.evaluate(() => {
      return window.jupyterapp.commands.execute('notebook:clear-cell-output');
    });
    await waitForNotebookLayout(page);

    // Make the third cell fully visible
    await positionCellPartiallyBelowViewport(page, notebook!, thirdCell!, 1);

    // The third cell should occupy non-zero portion of the viewport (sanity check)
    expect(await notebookViewportRatio(notebook!, thirdCell!)).toBeGreaterThan(
      0
    );

    // Run second cell which will generate a lot of
    // output that would have shifted the third cell
    // out of view if not for scroll anchoring
    await page.notebook.runCell(1, { inplace: false });

    // After running second cell and advancing to third cell, it should remain in the viewport
    await expect(thirdCell!).toBeInViewport({ ratio: 0.1 });

    // It should should still occupy non-zero portion of the viewport (sanity check)
    expect(await notebookViewportRatio(notebook!, thirdCell!)).toBeGreaterThan(
      0
    );
  });

  test('should keep the position the user scrolled to while a cell above generates a lot of output', async ({
    page
  }) => {
    const notebook = await page.notebook.getNotebookInPanelLocator();
    const thirdCell = await page.notebook.getCellLocator(2);

    // Set second cell to produce long output with a delay long enough
    // to allow scrolling away while the execution is ongoing.
    await page.notebook.setCell(
      1,
      'code',
      'from time import sleep\nsleep(2)\nfor i in range(100):\n    print(i)\n    sleep(0.05)\n'
    );

    // Select the second cell and clear its output
    await page.notebook.selectCells(1);
    await page.evaluate(() => {
      return window.jupyterapp.commands.execute('notebook:clear-cell-output');
    });

    // Show the top of the third cell at the bottom of the viewport. Its long
    // existing output, taller than the viewport, provides space to scroll into.
    await positionCellPartiallyBelowViewport(page, notebook!, thirdCell!, 0.2);

    // Start running the second cell with advance, without waiting for it
    const execution = page.evaluate(() => {
      return window.jupyterapp.commands.execute(
        'notebook:run-cell-and-select-next'
      );
    });

    // Scroll away while the initial `sleep` holds the output back
    const bbox = (await notebook!.boundingBox())!;
    await page.mouse.move(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2);
    await page.mouse.wheel(0, 600);

    // Let the scroll settle before taking the reference measurement
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(500);
    const referenceBox = (await thirdCell!.boundingBox())!;

    // Record the top of the third cell each time the second cell grows. This
    // observer runs after the observer of the list, just before the paint.
    await thirdCell!.evaluate(cell => {
      const tops: number[] = [];
      (window as any).thirdCellTops = tops;
      const secondCell = cell.parentElement!.querySelector(
        '[data-windowed-list-index="1"]'
      )!;
      new ResizeObserver(() => {
        tops.push(cell.getBoundingClientRect().top);
      }).observe(secondCell);
    });

    await execution;
    // Allow the layout to settle after the last output arrived
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(500);

    // The position the user scrolled to should have been kept while the
    // output of the cell above was growing
    const finalBox = (await thirdCell!.boundingBox())!;
    expect(Math.abs(finalBox.y - referenceBox.y)).toBeLessThan(150);

    // The cells in view should not move for a single frame either
    const tops: number[] = await page.evaluate(
      () => (window as any).thirdCellTops
    );
    for (const top of tops) {
      expect(Math.abs(top - referenceBox.y)).toBeLessThan(5);
    }
  });

  test('should keep the cells in view in place while the user scrolls and a cell above generates output', async ({
    page,
    browserName
  }) => {
    test.skip(
      browserName !== 'chromium',
      'A wheel scroll ends within one frame, so this test uses a Chromium scroll gesture'
    );
    const notebook = await page.notebook.getNotebookInPanelLocator();
    const thirdCell = await page.notebook.getCellLocator(2);

    await page.notebook.setCell(
      1,
      'code',
      'from time import sleep\nsleep(2)\nfor i in range(100):\n    print(i)\n    sleep(0.05)\n'
    );
    await page.notebook.selectCells(1);
    await page.evaluate(() => {
      return window.jupyterapp.commands.execute('notebook:clear-cell-output');
    });
    await positionCellPartiallyBelowViewport(page, notebook!, thirdCell!, 0.2);

    const execution = page.evaluate(() => {
      return window.jupyterapp.commands.execute(
        'notebook:run-cell-and-select-next'
      );
    });

    // Scroll the second cell out of view while the initial `sleep` holds the
    // output back
    const bbox = (await notebook!.boundingBox())!;
    await page.mouse.move(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2);
    await page.mouse.wheel(0, 600);

    // Record the top of the third cell before every paint: the element below
    // resizes on every frame, and its observer runs after the list's observer.
    await thirdCell!.evaluate(cell => {
      const tops: number[] = [];
      (window as any).thirdCellTops = tops;
      const ticker = document.createElement('div');
      ticker.style.cssText = 'position: fixed; width: 1px; height: 1px;';
      document.body.appendChild(ticker);
      new ResizeObserver(() => {
        tops.push(cell.getBoundingClientRect().top);
      }).observe(ticker);
      const tick = () => {
        ticker.style.height = ticker.style.height === '1px' ? '2px' : '1px';
        if (!(window as any).stopThirdCellTops) {
          requestAnimationFrame(tick);
        }
      };
      tick();
    });

    // Scroll down slowly while the output arrives
    await page
      .locator('.jp-Cell[data-windowed-list-index="1"] .jp-OutputArea-output')
      .first()
      .waitFor({ state: 'attached' });
    const client = await page.context().newCDPSession(page.mainFrame());
    await client.send('Input.synthesizeScrollGesture', {
      x: Math.round(bbox.x + bbox.width / 2),
      y: Math.round(bbox.y + bbox.height / 2),
      yDistance: -200,
      speed: 100,
      gestureSourceType: 'mouse'
    });

    await execution;
    // Allow the layout to settle after the last output arrived
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(500);

    // The user scrolls down, so the cells in view should never move down
    const tops: number[] = await page.evaluate(() => {
      (window as any).stopThirdCellTops = true;
      return (window as any).thirdCellTops;
    });
    const moves = tops.slice(1).map((top, i) => top - tops[i]);
    expect(Math.max(...moves)).toBeLessThan(5);
  });

  test('should not scroll when advancing if top is non-marginally visible', async ({
    page
  }) => {
    const notebook = await page.notebook.getNotebookInPanelLocator();
    const thirdCell = await page.notebook.getCellLocator(2);

    await positionCellPartiallyBelowViewport(page, notebook!, thirdCell!, 0.15);
    // Select second cell
    await page.notebook.selectCells(1);

    // The third cell should be positioned at the bottom, revealing between 10 to 20% of its content.
    await expect(thirdCell!).toBeInViewport({ ratio: 0.1 });
    await expect(thirdCell!).not.toBeInViewport({ ratio: 0.2 });
    // This cell should initially take up between 30% and 50% of the notebook viewport
    let spaceTaken = await notebookViewportRatio(notebook!, thirdCell!);
    expect(spaceTaken).toBeGreaterThan(0.3);
    expect(spaceTaken).toBeLessThan(0.5);

    // Run second cell
    await page.notebook.runCell(1);
    // After running the second cell, the third cell should not be scrolled
    await expect(thirdCell!).not.toBeInViewport({ ratio: 0.2 });
    // The cell should still take up between 30% and 50% of the notebook viewport
    spaceTaken = await notebookViewportRatio(notebook!, thirdCell!);
    expect(spaceTaken).toBeGreaterThan(0.3);
    expect(spaceTaken).toBeLessThan(0.5);
  });

  test('should not scroll when running in-place', async ({ page }) => {
    const notebook = await page.notebook.getNotebookInPanelLocator();
    const thirdCell = await page.notebook.getCellLocator(2);

    await positionCellPartiallyBelowViewport(page, notebook!, thirdCell!, 0.15);
    // Select third cell
    await page.notebook.enterCellEditingMode(2);

    // The third cell should be positioned at the bottom, revealing between 10 to 20% of its content.
    await expect(thirdCell!).toBeInViewport({ ratio: 0.1 });
    await expect(thirdCell!).not.toBeInViewport({ ratio: 0.2 });

    // Run third cell in-place
    await page.notebook.runCell(2, true);
    // After running the third cell it should not be scrolled
    await expect(thirdCell!).not.toBeInViewport({ ratio: 0.2 });

    // The galata implementation of `page.notebook.runCell(2, true);`
    // first switches to command mode before cell execution,
    // so we want to also check if this works from edit mode too.
    await page.keyboard.press('Control+Enter');

    // After running the third cell it should not be scrolled
    await expect(thirdCell!).not.toBeInViewport({ ratio: 0.2 });
  });
});

test.describe('Notebook scroll over long outputs (with windowing)', () => {
  const outputAndHeading = 'long_output_and_headings.ipynb';
  test.beforeEach(async ({ page, tmpPath }) => {
    await page.contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${outputAndHeading}`),
      `${tmpPath}/${outputAndHeading}`
    );

    await page.notebook.openByPath(`${tmpPath}/${outputAndHeading}`);
    await page.notebook.activate(outputAndHeading);
  });

  test.afterEach(async ({ page, tmpPath }) => {
    await page.contents.deleteDirectory(tmpPath);
  });

  test('should scroll smoothly without snapping to headings', async ({
    page
  }) => {
    const renderedMarkdownLocator = page.locator(
      '.jp-Cell .jp-RenderedMarkdown:has-text("Before")'
    );
    // Wait until Markdown cells are rendered
    await renderedMarkdownLocator.waitFor({ timeout: 500 });
    // Un-render the "before" markdown cell
    await renderedMarkdownLocator.dblclick();
    // Make the first cell active
    await page.notebook.selectCells(0);
    // Check that that the markdown cell is un-rendered
    await renderedMarkdownLocator.waitFor({ state: 'hidden', timeout: 500 });

    // Scroll to the last cell
    const lastCell = await page.notebook.getCellLocator(10);
    await lastCell!.scrollIntoViewIfNeeded();

    // Get the outer window
    const outer = page.locator('.jp-WindowedPanel-outer');

    let previousOffset = await outer.evaluate(node => node.scrollTop);
    expect(previousOffset).toBeGreaterThan(1000);

    const nbPanel = (await page.notebook.getNotebookInPanelLocator())!;
    const bbox = (await nbPanel.boundingBox())!;

    // Position mouse for scrolling
    await page.mouse.move(
      bbox.x + 0.5 * bbox.width,
      bbox.y + 0.5 * bbox.height
    );

    // Scroll piece by piece checking that there is no jump
    while (previousOffset > 75) {
      await page.mouse.wheel(0, -100);
      // poll until the scroll triggered by the wheel event has been applied.
      await expect
        .poll(() => outer.evaluate(node => node.scrollTop))
        .not.toBe(previousOffset);
      const offset = await outer.evaluate(node => node.scrollTop);
      const diff = previousOffset - offset;
      // The scroll should be by about 100px, but because wheel event
      // does not wait we allow for some wiggle room (+/-25px).
      expect(diff).toBeLessThanOrEqual(125);
      expect(diff).toBeGreaterThan(75);
      previousOffset = offset;
    }
  });
});

test.describe('Notebook scroll beyond a cell with long output (with windowing)', () => {
  const outputAndHeading = 'single_long_output.ipynb';
  test.beforeEach(async ({ page, tmpPath }) => {
    await page.contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${outputAndHeading}`),
      `${tmpPath}/${outputAndHeading}`
    );

    await page.notebook.openByPath(`${tmpPath}/${outputAndHeading}`);
    await page.notebook.activate(outputAndHeading);
  });

  test.afterEach(async ({ page, tmpPath }) => {
    await page.contents.deleteDirectory(tmpPath);
  });

  test('should not change height of the scrollbar when scrolling beyond the cell long', async ({
    page,
    browserName
  }) => {
    test.skip(browserName === 'firefox', 'Needs fixing on Firefox');
    // Make the first cell active
    await page.notebook.selectCells(0);

    // Get the outer window
    const outer = page.locator('.jp-WindowedPanel-outer');
    const scrollHeightBefore = await outer.evaluate(node => node.scrollHeight);

    // Scroll to the last cell
    const lastCell = await page.notebook.getCellLocator(30);
    await lastCell!.scrollIntoViewIfNeeded();

    const scrollHeightAfter = await outer.evaluate(node => node.scrollHeight);

    expect(scrollHeightBefore).toBeCloseTo(scrollHeightAfter);
  });
});

test.describe('Jump to execution button', () => {
  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/notebook-extension:tracker': {
        ...galata.DEFAULT_SETTINGS['@jupyterlab/notebook-extension:tracker'],
        recordTiming: true,
        kernelStatus: {
          ...(galata.DEFAULT_SETTINGS['@jupyterlab/notebook-extension:tracker']
            ?.kernelStatus ?? {}),
          showJumpToRecentExecutionButton: true
        }
      }
    }
  });
  test.beforeEach(async ({ page, tmpPath }) => {
    await page.contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${longOutputsNb}`),
      `${tmpPath}/${longOutputsNb}`
    );

    await page.notebook.openByPath(`${tmpPath}/${longOutputsNb}`);
    await page.notebook.activate(longOutputsNb);
  });

  test('should show jump button after first execution and scroll to executing cells', async ({
    page
  }) => {
    await page.notebook.setCell(0, 'code', 'from time import sleep\nsleep(2)');

    // Button doesn't exist before execution
    const indicator = page.locator('.jp-Notebook-ExecutionIndicator');
    await indicator.hover();
    await expect(
      page.locator('.jp-Notebook-ExecutionIndicator-jumpButton')
    ).toHaveCount(0);

    // Start executing the first cell (with 2 second sleep)
    await page.notebook.runCell(0, { inplace: false });

    // Add a cell at the end, it will have index 3 (fourth cell)
    await page.notebook.addCell('code', '1');

    // Schedule run of the last (fourth) cell we just added.
    // Because runCell relies on selection and jump action
    // does change selection in the meantime (which was causing
    // this test to randomly fail) we await for run but create
    // a promise to await for result manually.
    await page.notebook.runCell(3, { wait: false });
    const runPromise = page.notebook.waitForRun(3);

    // Hover and verify button exists
    await indicator.hover();
    const jumpButton = page.locator(
      '.jp-Notebook-ExecutionIndicator-jumpButton'
    );
    await expect(jumpButton).toBeVisible();

    // Click and scroll to the first cell (currently executing)
    await jumpButton.click();
    const firstCell = await page.notebook.getCellLocator(0);
    await firstCell?.waitFor({ state: 'visible', timeout: 1000 });

    // Wait for all executions to complete
    await runPromise;

    // Click and scroll to last cell (last executed)
    await indicator.hover();
    await jumpButton.click();
    const lastCell = await page.notebook.getCellLocator(3);
    await lastCell?.waitFor({ state: 'visible', timeout: 1000 });
  });
});
