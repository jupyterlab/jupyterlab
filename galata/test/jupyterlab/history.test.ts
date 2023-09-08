import { expect, test } from '@jupyterlab/galata';

const fileName = 'notebook.ipynb';
// const TRUSTED_SELECTOR = 'svg[data-icon="ui-components:trusted"]';

// async function populateNotebook(page: IJupyterLabPageFixture) {
//   await page.notebook.setCell(0, 'raw', 'Just a raw cell');
//   await page.notebook.addCell(
//     'code', 'print("history")',
//    );
//   await page.notebook.addCell('code', '2 ** 3');
// }

test.describe('make a notebook', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(fileName);
  });
  test('attempting', async ({ page }) => {
    await page.notebook.addCell('code', 'print("history expected")');
    // await page.notebook.runCell(1, true)
    await page.notebook.addCell('code', '2 ** 3');
    await page.notebook.run();
    // const output = (await page.notebook.getCellTextOutput(1))[0]
    // expect(output).toBe("1");
    await page.notebook.enterCellEditingMode(2);
    await page.keyboard.press('Alt+ArrowUp');
    // await page.notebook.leaveCellEditingMode(2);
    // const new_text = await (await page.notebook.getCell(2)).getAttribute('');
    // await page.pause()
    // expect(new_text).toBe('print("history expected")')
    const imageName = 'history.png';
    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(imageName);
  });
});
