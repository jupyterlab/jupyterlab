// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';

test.use({
  mockSettings: {
    ...galata.DEFAULT_SETTINGS,
    '@jupyterlab/notebook-extension:tracker': {
      ...galata.DEFAULT_SETTINGS['@jupyterlab/notebook-extension:tracker'],
      maxNumberOutputs: 5
    }
  }
});

test('Limit cell outputs', async ({ page }) => {
  await page.notebook.createNew();

  await page.waitForSelector('text=| Idle');

  await page.locator('div[role="main"] >> textarea')
    .fill(`from IPython.display import display, Markdown

for i in range(10):
    display(Markdown('_Markdown_ **text**'))
`);

  await page.notebook.run();

  await expect(page.locator('.jp-RenderedMarkdown')).toHaveCount(5);
  await expect(page.locator('.jp-TrimmedOutputs')).toHaveText(
    `
          Output of this cell has been trimmed on the initial display.
          Displaying the first 5 top outputs.
          Click on this message to get the complete output.
`
  );
});

test("Don't limit cell outputs if input is requested", async ({ page }) => {
  await page.notebook.createNew();

  await page.waitForSelector('text=| Idle');

  await page.locator('div[role="main"] >> textarea')
    .fill(`from IPython.display import display, Markdown

for i in range(10):
    display(Markdown('_Markdown_ **text**'))

input('Your age:')
`);

  await page.menu.clickMenuItem('Run>Run All Cells');
  await page.waitForSelector('.jp-Stdin >> text=Your age:');

  expect(await page.locator('.jp-RenderedMarkdown').count()).toBeGreaterThan(5);

  await page.keyboard.press('Enter');
});

test('Display input value', async ({ page }) => {
  await page.notebook.createNew();

  await page.waitForSelector('text=| Idle');

  await page.locator('div[role="main"] >> textarea')
    .fill(`from IPython.display import display, Markdown

for i in range(10):
    display(Markdown('_Markdown_ **text**'))

input('Your age:')

for i in range(10):
    display(Markdown('_Markdown_ **text**'))
`);

  await page.menu.clickMenuItem('Run>Run All Cells');
  await page.waitForSelector('.jp-Stdin >> text=Your age:');

  await page.keyboard.type('42');
  await page.keyboard.press('Enter');

  expect(await page.locator('.jp-RenderedMarkdown').count()).toBeGreaterThan(5);
  await expect(page.locator('.jp-RenderedText').first()).toHaveText(
    'Your age: 42'
  );
});
