// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import type { Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// The image is 306 x 433 pixels.
const IMAGE = 'WidgetArch.png';
const IMAGE_WIDTH = 306;
const IMAGE_RATIO = 306 / 433;

const imageData = fs
  .readFileSync(path.resolve(__dirname, 'notebooks', IMAGE))
  .toString('base64');

function imageOutputCell(size: { width?: number; height?: number }) {
  const args = Object.entries(size).map(([key, value]) => `, ${key}=${value}`);
  return {
    cell_type: 'code',
    execution_count: 1,
    id: 'image-output',
    metadata: {},
    outputs: [
      {
        data: {
          'image/png': imageData,
          'text/plain': ['<IPython.core.display.Image object>']
        },
        metadata: { 'image/png': size },
        output_type: 'display_data'
      }
    ],
    source: [`Image("${IMAGE}"${args.join('')})`]
  };
}

function markdownCell(source: string) {
  return { cell_type: 'markdown', id: 'markdown', metadata: {}, source };
}

function notebook(cell: Record<string, unknown>): string {
  return JSON.stringify({
    cells: [cell],
    metadata: {
      kernelspec: {
        display_name: 'Python 3',
        language: 'python',
        name: 'python3'
      },
      language_info: { name: 'python' }
    },
    nbformat: 4,
    nbformat_minor: 5
  });
}

const notebooks: Record<string, string> = {
  'output-size.ipynb': notebook(imageOutputCell({ width: 300, height: 30 })),
  'output-wide.ipynb': notebook(imageOutputCell({ width: 1530, height: 2165 })),
  'output-height-wide.ipynb': notebook(imageOutputCell({ height: 2165 })),
  'markdown-height.ipynb': notebook(
    markdownCell(`<img src="${IMAGE}" height="30">`)
  ),
  'markdown-wide.ipynb': notebook(
    markdownCell(`<img src="${IMAGE}" width="1530" height="2165">`)
  ),
  'markdown-height-wide.ipynb': notebook(
    markdownCell(`<img src="${IMAGE}" height="2165">`)
  ),
  'markdown-height-px-wide.ipynb': notebook(
    markdownCell(`<img src="${IMAGE}" height="2165px">`)
  ),
  'markdown-style.ipynb': notebook(
    markdownCell(`<div class="gallery"><img src="${IMAGE}"></div>`)
  )
};

/**
 * Wait for the image data to load, then return the box of the image.
 */
async function loadedImageBox(image: Locator) {
  await expect
    .poll(() =>
      image.evaluate(element =>
        element instanceof HTMLImageElement ? element.naturalWidth : 0
      )
    )
    .toBe(IMAGE_WIDTH);
  return (await image.boundingBox())!;
}

test.describe('Image size', () => {
  test.use({ tmpPath: 'test-image-size' });

  test.beforeAll(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.uploadFile(
      path.resolve(__dirname, 'notebooks', IMAGE),
      `${tmpPath}/${IMAGE}`
    );
    for (const [name, content] of Object.entries(notebooks)) {
      await contents.uploadContent(content, 'text', `${tmpPath}/${name}`);
    }
  });

  test('Show an image output at the width and height from its metadata', async ({
    page,
    tmpPath
  }) => {
    await page.notebook.openByPath(`${tmpPath}/output-size.ipynb`);

    const box = await loadedImageBox(page.locator('.jp-RenderedImage img'));

    expect(box.width).toBeCloseTo(300, 0);
    expect(box.height).toBeCloseTo(30, 0);
  });

  test('Keep the aspect ratio of an image output wider than the notebook', async ({
    page,
    tmpPath
  }) => {
    await page.notebook.openByPath(`${tmpPath}/output-wide.ipynb`);

    const box = await loadedImageBox(page.locator('.jp-RenderedImage img'));

    expect(box.width).toBeLessThan(1530);
    expect(box.height).toBeCloseTo(box.width / IMAGE_RATIO, 0);
  });

  test('Keep the aspect ratio of an image output with only a height wider than the notebook', async ({
    page,
    tmpPath
  }) => {
    await page.notebook.openByPath(`${tmpPath}/output-height-wide.ipynb`);
    const image = page.locator('.jp-RenderedImage img');
    await loadedImageBox(image);

    // The width comes from the image data after its load event.
    await expect
      .poll(async () => {
        const box = (await image.boundingBox())!;
        return box.height - box.width / IMAGE_RATIO;
      })
      .toBeCloseTo(0, 0);
  });

  test('Show a Markdown image at the height from its attribute', async ({
    page,
    tmpPath
  }) => {
    await page.notebook.openByPath(`${tmpPath}/markdown-height.ipynb`);

    const box = await loadedImageBox(page.locator('.jp-RenderedMarkdown img'));

    expect(box.height).toBeCloseTo(30, 0);
  });

  test('Keep the aspect ratio of a Markdown image wider than the notebook', async ({
    page,
    tmpPath
  }) => {
    await page.notebook.openByPath(`${tmpPath}/markdown-wide.ipynb`);

    const box = await loadedImageBox(page.locator('.jp-RenderedMarkdown img'));

    expect(box.width).toBeLessThan(1530);
    expect(box.height).toBeCloseTo(box.width / IMAGE_RATIO, 0);
  });

  test('Keep the aspect ratio of a Markdown image with only a height wider than the notebook', async ({
    page,
    tmpPath
  }) => {
    await page.notebook.openByPath(`${tmpPath}/markdown-height-wide.ipynb`);
    const image = page.locator('.jp-RenderedMarkdown img');
    await loadedImageBox(image);

    // The width comes from the image data after its load event.
    await expect
      .poll(async () => {
        const box = (await image.boundingBox())!;
        return box.height - box.width / IMAGE_RATIO;
      })
      .toBeCloseTo(0, 0);
  });

  test('Keep the aspect ratio of a Markdown image with only a height in pixels wider than the notebook', async ({
    page,
    tmpPath
  }) => {
    await page.notebook.openByPath(`${tmpPath}/markdown-height-px-wide.ipynb`);
    const image = page.locator('.jp-RenderedMarkdown img');
    await loadedImageBox(image);

    // The width comes from the image data after its load event.
    await expect
      .poll(async () => {
        const box = (await image.boundingBox())!;
        return box.height - box.width / IMAGE_RATIO;
      })
      .toBeCloseTo(0, 0);
  });

  test('Let a style sheet set the height of a Markdown image', async ({
    page,
    tmpPath
  }) => {
    // Same specificity as the rule of JupyterLab and later in the document,
    // as the style sheet of an HTML output is.
    await page.addStyleTag({ content: '.gallery img { height: 30px; }' });
    await page.notebook.openByPath(`${tmpPath}/markdown-style.ipynb`);

    const box = await loadedImageBox(page.locator('.jp-RenderedMarkdown img'));

    expect(box.height).toBeCloseTo(30, 0);
  });
});
