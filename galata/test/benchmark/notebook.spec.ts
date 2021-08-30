// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from '@playwright/test';
import { benchmark, galata, test } from '@jupyterlab/galata';
import path from 'path';

test.use({
  // Remove codemirror cursor
  mockSettings: {
    '@jupyterlab/fileeditor-extension:plugin': {
      editorConfig: { cursorBlinkRate: -1 }
    },
    '@jupyterlab/notebook-extension:tracker': {
      codeCellConfig: { cursorBlinkRate: -1 },
      markdownCellConfig: { cursorBlinkRate: -1 },
      rawCellConfig: { cursorBlinkRate: -1 }
    }
  },
  tmpPath: 'test-performance-open'
});

const codeNotebook = 'large_code_notebook.ipynb';
const mdNotebook = 'large_md_notebook.ipynb';
const textFile = 'lorem_ipsum.txt';

test.describe.serial('Benchmark', () => {
  // Generate the files for the benchmark
  test.beforeAll(async ({ baseURL, tmpPath }) => {
    const contents = galata.newContentsHelper(baseURL);

    const codeContent = galata.Notebook.generateNotebook(300, 'code', [
      'for x in range(OUTPUT_LENGTH):\n',
      '    print(f"{PREFIX} {x}")'
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

    const loremIpsum =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin molestie suscipit libero non volutpat. Suspendisse et tincidunt metus. Proin laoreet magna rutrum egestas tristique. Proin vel neque sit amet lectus egestas pellentesque nec quis nisl. Quisque faucibus condimentum leo, quis euismod eros ultrices in. Vivamus maximus malesuada tempor. Aliquam maximus maximus elit, ac imperdiet tellus posuere nec. Sed at rutrum velit. Etiam et lectus convallis, sagittis nibh sit amet, gravida turpis. Nulla nec velit id est tristique iaculis.\n\nDonec vel finibus mauris, eu tristique justo. Pellentesque turpis lorem, lobortis eu tincidunt non, cursus sit amet ex. Vivamus eget ligula a leo vulputate egestas a eu felis. Donec sollicitudin maximus neque quis condimentum. Cras vestibulum nulla libero, sed semper velit faucibus ac. Phasellus et consequat risus. Sed suscipit ligula est. Etiam ultricies ac lacus sit amet cursus. Nam non leo vehicula, iaculis eros eu, consequat sapien. Ut quis odio quis augue pharetra porttitor sit amet eget nisl. Vestibulum magna eros, rutrum ac nisi non, lobortis varius ipsum. Proin luctus euismod arcu eget sollicitudin. Praesent nec erat gravida, tincidunt diam eget, tempor tortor.';
    await contents.uploadContent(loremIpsum, 'text', `${tmpPath}/${textFile}`);
  });

  // Remove benchmark files
  test.afterAll(async ({ baseURL, tmpPath }) => {
    const contents = galata.newContentsHelper(baseURL);
    await contents.deleteDirectory(tmpPath);
  });

  // Loop on benchmark files nSamples times
  //  For each file, benchmark:
  //  - Open the file
  //  - Switch to a text file
  //  - Switch back to the file
  //  - Close the file
  for (const file of [codeNotebook, mdNotebook]) {
    for (let sample = 0; sample < benchmark.nSamples; sample++) {
      test(`measure ${file} - ${sample + 1}`, async ({
        browserName,
        page,
        tmpPath
      }, testInfo) => {
        const attachmentCommon = {
          nSamples: benchmark.nSamples,
          browser: browserName,
          file: path.basename(file, '.ipynb')
        };

        await page.performance.startTimer('open-notebook');

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

        const openTime = await page.performance.endTimer('open-notebook');

        // Check the notebook is correctly opened
        let panel = await page.activity.getPanel();
        // Get only the document node to avoid noise from kernel and debugger in the toolbar
        let document = await panel.$('.jp-Notebook');
        expect(await document.screenshot()).toMatchSnapshot(
          `${file.replace('.', '-')}.png`
        );

        testInfo.attachments.push(
          benchmark.addAttachment({
            ...attachmentCommon,
            test: 'open',
            time: openTime
          })
        );

        // Open text file
        await page.filebrowser.revealFileInBrowser(`${tmpPath}/${textFile}`);

        await page.performance.startTimer('switch-from-notebook');
        await page.filebrowser.open(textFile);
        await page.waitForCondition(
          async () => await page.activity.isTabActive(path.basename(textFile))
        );
        const fromTime = await page.performance.endTimer(
          'switch-from-notebook'
        );

        let editorPanel = await page.activity.getPanel();
        expect(await editorPanel.screenshot()).toMatchSnapshot(
          'loremIpsum.png'
        );

        testInfo.attachments.push(
          benchmark.addAttachment({
            ...attachmentCommon,
            test: 'switch-from',
            time: fromTime
          })
        );

        // Switch back
        await page.performance.startTimer('switch-to-notebook');
        await page.notebook.openByPath(`${tmpPath}/${file}`);
        const toTime = await page.performance.endTimer('switch-to-notebook');

        // Check the notebook is correctly opened
        panel = await page.activity.getPanel();
        // Get only the document node to avoid noise from kernel and debugger in the toolbar
        document = await panel.$('.jp-Notebook');
        expect(await document.screenshot()).toMatchSnapshot(
          `${file.replace('.', '-')}.png`
        );

        testInfo.attachments.push(
          benchmark.addAttachment({
            ...attachmentCommon,
            test: 'switch-to',
            time: toTime
          })
        );

        // Close notebook
        await page.performance.startTimer('close-notebook');
        // Revert changes so we don't measure saving
        await page.notebook.close(true);
        const closeTime = await page.performance.endTimer('close-notebook');

        editorPanel = await page.activity.getPanel();
        expect(await editorPanel.screenshot()).toMatchSnapshot(
          'loremIpsum.png'
        );

        testInfo.attachments.push(
          benchmark.addAttachment({
            ...attachmentCommon,
            test: 'close',
            time: closeTime
          })
        );
      });
    }
  }
});
