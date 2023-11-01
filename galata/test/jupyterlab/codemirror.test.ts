// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';

const DEFAULT_NAME = 'untitled.txt';

const RULERS_CONTENT = `0123456789
          0123456789
                    0123456789
                              0123456789
                                        0123456789
                                                  0123456789
0123456789
          0123456789
                    0123456789
                              0123456789
                                        0123456789
                                                  0123456789`;

test.describe('CodeMirror extensions', () => {
  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/codemirror-extension:plugin': {
        defaultConfig: {
          rulers: [10, 20, 30, 40, 50, 60]
        }
      }
    }
  });

  test('Should display rulers', async ({ page }) => {
    await page.menu.clickMenuItem('File>New>Text File');

    await page.getByRole('tab', { name: DEFAULT_NAME }).waitFor();

    const editor = page.getByRole('region', { name: 'notebook content' });
    await editor.getByRole('textbox').fill(RULERS_CONTENT);

    expect(await editor.screenshot()).toMatchSnapshot('codemirror-rulers.png');
  });
});
