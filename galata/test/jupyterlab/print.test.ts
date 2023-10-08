// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';
import * as path from 'path';

test.use({ autoGoto: false });

const fileName = 'simple_notebook.ipynb';

test.describe('Print layout', () => {
  test('Notebook', async ({ page, tmpPath }) => {
    await page.emulateMedia({ media: 'print' });
    await page.contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );
    await page.contents.uploadFile(
      path.resolve(__dirname, './notebooks/WidgetArch.png'),
      `${tmpPath}/WidgetArch.png`
    );

    await page.goto();

    await page.notebook.openByPath(`${tmpPath}/${fileName}`);

    await page.getByText('Python 3 (ipykernel) | Idle').waitFor();

    await page.notebook.run();

    let printedNotebookURL = '';
    await Promise.all([
      page.waitForRequest(
        async request => {
          const url = request.url();
          if (url.match(/\/nbconvert\//) !== null) {
            printedNotebookURL = url;
            return true;
          }
          return false;
        },
        { timeout: 1000 }
      ),
      page.keyboard.press('Control+P')
    ]);

    const newPage = await page.context().newPage();

    await newPage.goto(printedNotebookURL, { waitUntil: 'networkidle' });

    // Wait until MathJax loading message disappears
    const mathJaxMessage = newPage.locator('#MathJax_Message');
    await expect(mathJaxMessage).toHaveCount(1);
    await mathJaxMessage.waitFor({ state: 'hidden' });

    expect(await newPage.screenshot()).toMatchSnapshot('printed-notebook.png');
  });
});
