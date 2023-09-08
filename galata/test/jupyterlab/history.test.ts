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
    await page.notebook.setCell(0, 'code', '1 + 2');
    await page.notebook.addCell('code', '2 + 3');
    // await page.notebook.runCell(1, true)
    await page.notebook.addCell('code', '3 + 4');
    await page.notebook.run();
    // const output = (await page.notebook.getCellTextOutput(1))[0]
    // expect(output).toBe("1");
    const timeout = 1000;

    await page.waitForTimeout(timeout);
    await page.notebook.enterCellEditingMode(2);
    await page.keyboard.press('Alt+ArrowUp');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    // await page.notebook.leaveCellEditingMode(2);
    await page.waitForTimeout(timeout);

    // await page.notebook.enterCellEditingMode(1);
    // await page.notebook.leaveCellEditingMode(1);

    // await page.notebook.enterCellEditingMode(2);
    // await page.waitForTimeout(timeout)
    await page.keyboard.press('Alt+ArrowUp');
    await page.waitForTimeout(timeout);
    await page.keyboard.press('Alt+ArrowDown');
    await page.waitForTimeout(timeout);
    await page.keyboard.press('Alt+ArrowUp');
    await page.waitForTimeout(timeout);
    await page.keyboard.press('Alt+ArrowUp');
    // await page.waitForCondition(()=>{return }, 100)
    await page.waitForTimeout(timeout);
    await page.keyboard.press('Alt+ArrowUp');
    // input should now be the same as first cell

    const imageName = 'history.png';
    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(imageName);
  });
});
