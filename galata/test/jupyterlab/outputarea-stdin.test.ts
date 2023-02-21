// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, IJupyterLabPageFixture, test } from '@jupyterlab/galata';

const fileName = 'stdin.ipynb';

async function populateNotebook(page: IJupyterLabPageFixture) {
  await page.notebook.addCell('code', 'raise');
}

test.describe('Stdin for ipdb', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(fileName);
  });

  test('Stdin history search', async ({ page }) => {
    await populateNotebook(page);
    await page.notebook.addCell('code', '%debug');
    await page.notebook.run();

    // enter a bunch of nonsense commands into the stdin attached to ipdb
    await page.keyboard.insertText('foofoo');
    await page.keyboard.press('Enter');
    await page.keyboard.insertText('barbar');
    await page.keyboard.press('Enter');
    await page.keyboard.insertText('bazbaz');
    await page.keyboard.press('Enter');

    // search for the first nonsense command
    await page.keyboard.insertText('foo');
    await page.keyboard.press('Control+ArrowUp');

    const imageName = 'stdin-history-search.png';
    const nbPanel = await page.notebook.getNotebookInPanel();
    expect(await nbPanel.screenshot()).toMatchSnapshot(imageName);
  });
});
