// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';

const MAX_OUTPUTS = 5;

test.use({
  mockSettings: {
    ...galata.DEFAULT_SETTINGS,
    '@jupyterlab/notebook-extension:tracker': {
      ...galata.DEFAULT_SETTINGS['@jupyterlab/notebook-extension:tracker'],
      maxNumberOutputs: MAX_OUTPUTS
    }
  }
});

test('Limit cell outputs', async ({ page }) => {
  await page.notebook.createNew();

  await page.locator(
    '.jp-Cell-inputArea >> .cm-editor >> .cm-content[contenteditable="true"]'
  ).fill(`from IPython.display import display, Markdown

for i in range(10):
    display(Markdown('_Markdown_ **text**'))
`);

  await page.notebook.run();

  await expect(page.locator('.jp-RenderedMarkdown')).toHaveCount(MAX_OUTPUTS);
  await expect(page.locator('.jp-TrimmedOutputs')).toHaveText(
    'Show more outputs'
  );
});

test("Don't limit cell outputs if input is requested", async ({ page }) => {
  await page.notebook.createNew();

  await page.locator(
    '.jp-Cell-inputArea >> .cm-editor >> .cm-content[contenteditable="true"]'
  ).fill(`from IPython.display import display, Markdown

for i in range(10):
    display(Markdown('_Markdown_ **text**'))

input('Your age:')
`);

  await page.menu.clickMenuItem('Run>Run All Cells');
  await page.locator('.jp-Stdin >> text=Your age:').waitFor();
  expect(await page.locator('.jp-RenderedMarkdown').count()).toBeGreaterThan(
    MAX_OUTPUTS
  );

  await page.keyboard.press('Enter');
});

test('Display input value', async ({ page }) => {
  await page.notebook.createNew();

  await page.locator(
    '.jp-Cell-inputArea >> .cm-editor >> .cm-content[contenteditable="true"]'
  ).fill(`from IPython.display import display, Markdown

for i in range(10):
    display(Markdown('_Markdown_ **text**'))

input('Your age:')

for i in range(10):
    display(Markdown('_Markdown_ **text**'))
`);

  await page.menu.clickMenuItem('Run>Run All Cells');
  await page.locator('.jp-Stdin >> text=Your age:').waitFor();

  await page.keyboard.type('42');
  await page.keyboard.press('Enter');

  expect(await page.locator('.jp-RenderedMarkdown').count()).toBeGreaterThan(
    MAX_OUTPUTS
  );
  await expect(page.locator('.jp-RenderedText').first()).toHaveText(
    'Your age: 42'
  );
});
