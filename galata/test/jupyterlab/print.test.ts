// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';
import * as fs from 'fs';
import * as path from 'path';

test.use({ autoGoto: false });

const fileName = 'simple_notebook.ipynb';

/**
 * CSS with the fonts which Galata pins, for the printed notebook.
 *
 * The printed notebook does not load the Galata extension, and its sandbox
 * blocks requests for the extension's font files, so the fonts are inlined.
 */
function pinnedFontsCSS(): string {
  const fontFaces = [
    ['DejaVu Sans', 'dejavu-sans'],
    ['DejaVu Mono', 'dejavu-mono']
  ].map(([family, name]) => {
    const file = `@fontsource/${name}/files/${name}-latin-400-normal.woff2`;
    const data = fs.readFileSync(require.resolve(file)).toString('base64');
    return `@font-face { font-family: '${family}'; src: url(data:font/woff2;base64,${data}); }`;
  });
  return `${fontFaces.join('\n')}
:root {
  --jp-ui-font-family: 'DejaVu Sans';
  --jp-content-font-family: 'DejaVu Sans';
  --jp-code-font-family-default: 'DejaVu Mono';
}`;
}

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

    await newPage.goto(printedNotebookURL, { waitUntil: 'load' });

    // Wait until MathJax loading message disappears
    const mathJaxMessage = newPage.locator('#MathJax_Message');
    await expect(mathJaxMessage).toHaveCount(1);
    await mathJaxMessage.waitFor({ state: 'hidden' });

    await newPage.addStyleTag({ content: pinnedFontsCSS() });

    expect(await newPage.screenshot()).toMatchSnapshot('printed-notebook.png');
  });
});
