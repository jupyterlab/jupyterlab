// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

test.use({
  locale: 'en-US'
});

const loopedInput = `\
from time import sleep
input()
print('before sleep')
sleep(0.1)
print('after sleep')`;

const ACTIVE_INPUT =
  '.jp-OutputArea-stdin-item:not(.jp-OutputArea-stdin-hiding) .jp-Stdin-input';

test.describe('Stdin for ipdb', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew();
  });

  test('Stdin history search', async ({ page }) => {
    await page.notebook.setCell(0, 'code', 'raise');
    await page.notebook.addCell('code', '%debug');

    // Run first cell and proceed to the second one.
    await page.notebook.runCell(0);

    // Run the selected (second) cell without proceeding and without waiting
    // for it to complete (as it should stay waiting for input).
    await page.keyboard.press('Control+Enter');

    // enter a bunch of nonsense commands into the stdin attached to ipdb
    await page.waitForSelector(ACTIVE_INPUT);
    await page.keyboard.insertText('foofoo');
    await page.keyboard.press('Enter');

    await page.waitForSelector(ACTIVE_INPUT);
    await page.keyboard.insertText('barbar');
    await page.keyboard.press('Enter');

    await page.waitForSelector(ACTIVE_INPUT);
    await page.keyboard.insertText('bazbaz');
    await page.keyboard.press('Enter');

    // search for the first nonsense command
    await page.waitForSelector(ACTIVE_INPUT);
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

    // Check that the input remains focused and cursor is at the end.
    await page.keyboard.insertText('x');
    await expect(page.locator(ACTIVE_INPUT)).toHaveValue('foofoox');
  });

  test('Typing in stdin box', async ({ page }) => {
    // Test to ensure that notebook shortcuts do not capture text typed into inputs.
    // This may not be sufficient to ensure no conflicts with other languages but
    // should catch the most severe issues.
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    await page.notebook.setCell(0, 'code', 'input()');
    // Run the selected (only) cell without proceeding and without waiting
    // for it to complete (as it should stay waiting for input).
    await page.keyboard.press('Control+Enter');

    await page.waitForSelector('.jp-Stdin-input');
    for (const letter of alphabet) {
      await page.keyboard.press(`Key${letter.toUpperCase()}`);
    }
    for (const letter of alphabet) {
      await page.keyboard.press(`Shift+Key${letter.toUpperCase()}`);
    }
    for (const digit of digits) {
      await page.keyboard.press(`Digit${digit}`);
    }
    await expect(page.locator('.jp-Stdin-input')).toHaveValue(
      alphabet + alphabet.toUpperCase() + digits
    );
  });

  test('Subsequent execution in short succession', async ({ page }) => {
    await page.notebook.setCell(0, 'code', loopedInput);
    // Run the selected (only) cell without proceeding and without waiting
    // for it to complete (as it should stay waiting for input).
    await page.keyboard.press('Control+Enter');

    // Wait for first input
    await page.waitForSelector('.jp-Stdin-input');

    // Note: this test does not wait for subsequent inputs on purpose

    await page.getByText('before sleep').waitFor();

    // Press enter five times (should do nothing)
    for (let j = 0; j < 5; j++) {
      await page.keyboard.press('Enter');
    }
    // Press a key which should go to the input
    await page.keyboard.press('x');

    await page.getByText('after sleep').waitFor();

    // Press enter five times (should submit and then do nothing)
    for (let j = 0; j < 5; j++) {
      await page.keyboard.press('Enter');
    }

    const cellInput = await page.notebook.getCellInput(0);
    const editor = await cellInput.$('.cm-content');
    const contentAfter = await editor.evaluate((e: any) =>
      e.cmView.view.state.doc.toString()
    );
    expect(contentAfter).toBe(loopedInput);
  });
});
