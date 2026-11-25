// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

test('should render isolated plain text output', async ({ page, tmpPath }) => {
  const notebookName = 'isolated-text-output.ipynb';

  const notebook = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {},
    cells: [
      {
        cell_type: 'code',
        id: 'isolated-text-cell',
        metadata: {},
        execution_count: 1,
        source: 'pass',
        outputs: [
          {
            output_type: 'display_data',
            data: {
              'text/plain': 'hello isolated'
            },
            metadata: {
              isolated: true
            }
          }
        ]
      }
    ]
  };

  await page.contents.uploadContent(
    JSON.stringify(notebook),
    'text',
    `${tmpPath}/${notebookName}`
  );

  await page.notebook.openByPath(`${tmpPath}/${notebookName}`);

  const iframe = page.locator('.jp-OutputArea iframe.jp-mod-isolated');

  await expect(iframe).toHaveCount(1);

  await expect(
    page.frameLocator('.jp-OutputArea iframe.jp-mod-isolated').locator('body')
  ).toContainText('hello isolated');
});

test('should preserve isolated HTML output rendering', async ({
  page,
  tmpPath
}) => {
  const notebookName = 'isolated-html-output.ipynb';

  const notebook = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {},
    cells: [
      {
        cell_type: 'code',
        id: 'isolated-html-cell',
        metadata: {},
        execution_count: 1,
        source: 'pass',
        outputs: [
          {
            output_type: 'display_data',
            data: {
              'text/html': '<strong>hello html</strong>',
              'text/plain': 'hello html'
            },
            metadata: {
              isolated: true
            }
          }
        ]
      }
    ]
  };

  await page.contents.uploadContent(
    JSON.stringify(notebook),
    'text',
    `${tmpPath}/${notebookName}`
  );

  await page.notebook.openByPath(`${tmpPath}/${notebookName}`);

  const frame = page.frameLocator('.jp-OutputArea iframe.jp-mod-isolated');

  await expect(frame.locator('strong')).toHaveText('hello html');
});
