// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

test.describe('Stdin for ipdb', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew();
  });

  test('Stdin history search', async ({ page }) => {
    await page.notebook.setCell(0, 'code', 'raise');
    await page.notebook.addCell('code', '%debug');

    // Run first cell on proceed to the second one.
    await page.notebook.runCell(0);

    // Run the selected (second) cell without proceeding and without waiting
    // for it to complete (as it should stay waiting for input).
    await page.keyboard.press('Control+Enter');

    // enter a bunch of nonsense commands into the stdin attached to ipdb
    await page.waitForSelector('.jp-Stdin-input');
    await page.keyboard.insertText('foofoo');
    await page.keyboard.press('Enter');

    await page.waitForSelector('.jp-Stdin-input');
    await page.keyboard.insertText('barbar');
    await page.keyboard.press('Enter');

    await page.waitForSelector('.jp-Stdin-input');
    await page.keyboard.insertText('bazbaz');
    await page.keyboard.press('Enter');

    // search for the first nonsense command
    await page.waitForSelector('.jp-Stdin-input');
    await page.keyboard.insertText('foo');
    await page.keyboard.press('Control+ArrowUp');

    // Mask out random kernel temporary file path
    // e.g. `/tmp/ipykernel_104185/2235509928.py`
    const filePath = await page.$(
      '.jp-OutputArea-output :text-matches("/tmp/")'
    );
    await filePath.evaluate(node => (node.textContent = '/tmp/masked.py'));

    const imageName = 'stdin-history-search.png';
    const cell = await page.notebook.getCell(1);
    expect(await cell.screenshot()).toMatchSnapshot(imageName);
  });
});
