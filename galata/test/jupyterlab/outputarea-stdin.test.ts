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

const openShadowDOM = `\
from IPython.display import HTML
HTML("""<div id='root'></div><script>
document.querySelector('#root').attachShadow({mode: 'open'}).innerHTML = '<input id="shadow-input"/>';
</script>""")`;

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
    await page.locator(ACTIVE_INPUT).waitFor();
    await page.keyboard.insertText('foofoo');
    await page.keyboard.press('Enter');

    await page.locator(ACTIVE_INPUT).waitFor();
    await page.keyboard.insertText('barbar');
    await page.keyboard.press('Enter');

    await page.locator(ACTIVE_INPUT).waitFor();
    await page.keyboard.insertText('bazbaz');
    await page.keyboard.press('Enter');

    // search for the first nonsense command
    await page.locator(ACTIVE_INPUT).waitFor();
    await page.keyboard.insertText('foo');
    await page.keyboard.press('Control+ArrowUp');

    // Mask out random kernel temporary file path
    // e.g. `/tmp/ipykernel_104185/2235509928.py`
    const filePath = page.locator(
      '.jp-OutputArea-output :text-matches("/tmp/")'
    );
    await filePath.evaluate(node => (node.textContent = '/tmp/masked.py'));

    const imageName = 'stdin-history-search.png';
    const cell = await page.notebook.getCellLocator(1);
    expect(await cell!.screenshot()).toMatchSnapshot(imageName);

    // Check that the input remains focused and cursor is at the end.
    await page.keyboard.insertText('x');
    await expect(page.locator(ACTIVE_INPUT)).toHaveValue('foofoox');
  });

  const typingScenarios = [
    { name: 'stdin box', code: 'input()', selector: '.jp-Stdin-input' },
    { name: 'shadow DOM input', code: openShadowDOM, selector: '#shadow-input' }
  ];
  for (const testCase of typingScenarios) {
    test(`Typing in ${testCase.name}`, async ({ page }) => {
      // Test to ensure that notebook shortcuts do not capture text typed into inputs.
      // This may not be sufficient to ensure no conflicts with other languages but
      // should catch the most severe issues.
      const alphabet = 'abcdefghijklmnopqrstuvwxyz';
      const digits = '0123456789';
      await page.notebook.setCell(0, 'code', testCase.code);
      // Run the selected (only) cell without proceeding and without waiting
      // for it to complete (as it should stay waiting for input).
      await page.keyboard.press('Control+Enter');

      await page.locator(testCase.selector).waitFor();
      await page.focus(testCase.selector);

      for (const letter of alphabet) {
        await page.keyboard.press(`Key${letter.toUpperCase()}`);
      }
      for (const letter of alphabet) {
        await page.keyboard.press(`Shift+Key${letter.toUpperCase()}`);
      }
      for (const digit of digits) {
        await page.keyboard.press(`Digit${digit}`);
      }
      await expect(page.locator(testCase.selector)).toHaveValue(
        alphabet + alphabet.toUpperCase() + digits
      );
    });
  }
});

test.describe('Stdin for ipdb (flaky)', () => {
  test.describe.configure({ retries: 4 });

  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew();
  });

  test('Subsequent execution in short succession', async ({ page }) => {
    await page.notebook.setCell(0, 'code', loopedInput);
    // Run the selected (only) cell without proceeding and without waiting
    // for it to complete (as it should stay waiting for input).
    await page.keyboard.press('Control+Enter');

    // Wait for first input
    await page.locator('.jp-Stdin-input').waitFor();

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

    const cellInput = await page.notebook.getCellInputLocator(0);
    const editor = cellInput!.locator('.cm-content');
    const contentAfter = await editor.evaluate((e: any) =>
      e.cmView.view.state.doc.toString()
    );
    expect(contentAfter).toBe(loopedInput);
  });
});
