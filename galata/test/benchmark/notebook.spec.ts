// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from '@playwright/test';
import { benchmark, galata, test } from '@jupyterlab/galata';
import path from 'path';

test.use({
  tmpPath: 'test-performance-open'
});

const codeNotebook = 'large_code_notebook.ipynb';
const mdNotebook = 'large_md_notebook.ipynb';

test.describe.serial('Benchmark open large notebook', () => {
  test.beforeAll(async ({ baseURL, tmpPath }) => {
    const contents = galata.newContentsHelper(baseURL);

    const codeContent = galata.Notebook.generateNotebook(300, 'code', [
      'for x in range(OUTPUT_LENGTH):\n',
      "    print(f'{PREFIX} {x}')"
    ]);

    await contents.uploadContent(
      JSON.stringify(codeContent),
      'text',
      `${tmpPath}/${codeNotebook}`
    );

    const mdContent = galata.Notebook.generateNotebook(300, 'markdown', [
      '# Demonstration of proper behaviour with non-LaTeX uses of `$`\n',
      '\n',
      '## This should be highlighted as a heading\n',
      '\n',
      'Sample code:\n',
      '\n',
      '    ```\n',
      '    echo $HOME\n',
      '    ```\n',
      '\n',
      '```shell\n',
      'echo $HOME\n',
      '```\n',
      '\n',
      'The code block below should be properly highlighted:\n',
      '\n',
      '```bash\n',
      'echo $HOME\n',
      '```\n',
      '\n',
      '\n',
      '### Heading\n',
      '\n',
      '`$test`\n',
      '\n',
      '### This heading should be highlighted too'
    ]);

    await contents.uploadContent(
      JSON.stringify(mdContent),
      'text',
      `${tmpPath}/${mdNotebook}`
    );
  });

  test.afterAll(async ({ baseURL, tmpPath }) => {
    const contents = galata.newContentsHelper(baseURL);
    await contents.deleteDirectory(tmpPath);
  });

  for (const file of [codeNotebook, mdNotebook]) {
    for (let sample = 0; sample < benchmark.nSamples; sample++) {
      test(`measure ${file} - ${sample + 1}`, async ({
        browserName,
        page,
        tmpPath
      }, testInfo) => {
        await page.performance.startTimer();

        // Open the notebook and wait for the spinner
        await Promise.all([
          page.waitForSelector('[role="main"] >> .jp-SpinnerContent'),
          page.notebook.openByPath(`${tmpPath}/${file}`)
        ]);

        // Wait for spinner to be hidden
        await page.waitForSelector('[role="main"] >> .jp-SpinnerContent', {
          state: 'hidden'
        });

        // if (file === mdNotebook) {
        //   // Wait for Latex rendering => consider as acceptable to require additional time
        //   await page.waitForSelector('[role="main"] >> text=𝜌');
        // }
        // // Wait for kernel readiness => consider this is acceptable to take additional time
        // await page.waitForSelector(`#jp-main-statusbar >> text=Idle`);

        const time = await page.performance.endTimer();

        testInfo.attachments.push(
          benchmark.addAttachment({
            nSamples: benchmark.nSamples,
            browser: browserName,
            test: 'open',
            file: path.basename(file, '.ipynb'),
            time
          })
        );

        // Check the notebook is correctly opened
        const panel = await page.activity.getPanel();
        // Get only the document node to avoid noise from kernel and debugger in the toolbar
        const document = await panel.$('.jp-Notebook');
        expect(await document.screenshot()).toMatchSnapshot(
          `open-${file.replace('.', '-')}.png`
        );
      });
    }
  }
});
