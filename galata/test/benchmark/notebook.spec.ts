// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@playwright/test';
import { benchmark, galata } from '@jupyterlab/galata';
import path from 'path';

const tmpPath = 'test-performance-open';
const codeNotebook = 'large_code_notebook.ipynb';
const mdNotebook = 'large_md_notebook.ipynb';
const textFile = 'lorem_ipsum.txt';

// Build test parameters list [file, index]
const parameters = [].concat(
  ...[codeNotebook, mdNotebook].map(file =>
    new Array<number>(benchmark.nSamples)
      .fill(0)
      .map((_, index) => [file, index])
  )
);

test.describe('Benchmark', () => {
  // Generate the files for the benchmark
  test.beforeAll(async ({ request }) => {
    const content = galata.newContentsHelper(request);
    const codeContent = galata.Notebook.generateNotebook(300, 'code', [
      'for x in range(OUTPUT_LENGTH):\n',
      '    print(f"{PREFIX} {x}")'
    ]);

    await content.uploadContent(
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

    await content.uploadContent(
      JSON.stringify(mdContent),
      'text',
      `${tmpPath}/${mdNotebook}`
    );

    const loremIpsum =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin molestie suscipit libero non volutpat. Suspendisse et tincidunt metus. Proin laoreet magna rutrum egestas tristique. Proin vel neque sit amet lectus egestas pellentesque nec quis nisl. Quisque faucibus condimentum leo, quis euismod eros ultrices in. Vivamus maximus malesuada tempor. Aliquam maximus maximus elit, ac imperdiet tellus posuere nec. Sed at rutrum velit. Etiam et lectus convallis, sagittis nibh sit amet, gravida turpis. Nulla nec velit id est tristique iaculis.\n\nDonec vel finibus mauris, eu tristique justo. Pellentesque turpis lorem, lobortis eu tincidunt non, cursus sit amet ex. Vivamus eget ligula a leo vulputate egestas a eu felis. Donec sollicitudin maximus neque quis condimentum. Cras vestibulum nulla libero, sed semper velit faucibus ac. Phasellus et consequat risus. Sed suscipit ligula est. Etiam ultricies ac lacus sit amet cursus. Nam non leo vehicula, iaculis eros eu, consequat sapien. Ut quis odio quis augue pharetra porttitor sit amet eget nisl. Vestibulum magna eros, rutrum ac nisi non, lobortis varius ipsum. Proin luctus euismod arcu eget sollicitudin. Praesent nec erat gravida, tincidunt diam eget, tempor tortor.';
    await content.uploadContent(loremIpsum, 'text', `${tmpPath}/${textFile}`);
  });

  test.beforeEach(async ({ page }) => {
    await galata.Mock.mockSettings(page, [], galata.DEFAULT_SETTINGS);
  });

  // Remove benchmark files
  test.afterAll(async ({ request }) => {
    const content = galata.newContentsHelper(request);
    await content.deleteDirectory(tmpPath);
  });

  // Loop on benchmark files nSamples times
  //  For each file, benchmark:
  //  - Open the file
  //  - Switch to a text file
  //  - Switch back to the file
  //  - Close the file
  for (const [file, sample] of parameters) {
    test(`measure ${file} - ${sample + 1}`, async ({
      baseURL,
      browserName,
      page
    }, testInfo) => {
      const attachmentCommon = {
        nSamples: benchmark.nSamples,
        browser: browserName,
        file: path.basename(file, '.ipynb'),
        project: testInfo.project.name
      };
      const perf = galata.newPerformanceHelper(page);

      await page.goto(baseURL + '?reset');

      await page.click('#filebrowser >> .jp-BreadCrumbs-home');
      await page.dblclick(`#filebrowser >> text=${tmpPath}`);

      const openTime = await perf.measure(async () => {
        // Open the notebook and wait for the spinner
        await Promise.all([
          page.locator('[role="main"] >> .jp-SpinnerContent').waitFor(),
          page.dblclick(`#filebrowser >> text=${file}`)
        ]);

        // Wait for spinner to be hidden
        await page
          .locator('[role="main"] >> .jp-SpinnerContent')
          .waitFor({ state: 'hidden' });
      });

      // Check the notebook is correctly opened
      let panel = page.locator('[role="main"] >> .jp-NotebookPanel');
      // Get only the document node to avoid noise from kernel and debugger in the toolbar
      let document = panel.locator('.jp-Notebook');

      // Wait for the cell toolbar to be visible in code cell.
      if (file === codeNotebook) {
        await expect(
          page.locator(
            '.jp-Notebook .jp-Cell .jp-cell-toolbar:not(.jp-Toolbar-micro)'
          )
        ).toBeVisible();
      }

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

      // Shutdown the kernel to be sure it does not get in our way (especially for the close action)
      await page.click('li[role="menuitem"]:has-text("Kernel")');
      await page.click(
        '.lm-Menu ul[role="menu"] >> text=Shut Down All Kernels…'
      );
      await page.click('button:has-text("Shut Down All") >> nth=-1'); // Click on the last matched button.

      // Open text file
      const fromTime = await perf.measure(async () => {
        await page.dblclick(`#filebrowser >> text=${textFile}`);
        await page
          .locator(
            `div[role="main"] >> .lm-DockPanel-tabBar >> text=${path.basename(
              textFile
            )}`
          )
          .waitFor();
      });

      let editorPanel = page.locator(
        'div[role="tabpanel"]:has-text("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin mole")'
      );
      await expect(editorPanel).toBeVisible();

      testInfo.attachments.push(
        benchmark.addAttachment({
          ...attachmentCommon,
          test: 'switch-from',
          time: fromTime
        })
      );

      // Switch back
      const toTime = await perf.measure(async () => {
        await page.click(
          `div[role="main"] >> .lm-DockPanel-tabBar >> text=${file}`
        );
      });

      // Check the notebook is correctly opened
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
      await page.click('li[role="menuitem"]:has-text("File")');
      const closeTime = await perf.measure(async () => {
        await page.click('.lm-Menu ul[role="menu"] >> text=Close Tab');
        // Revert changes so we don't measure saving
        const dimissButton = page.locator('button:has-text("Discard")');
        if (await dimissButton.isVisible({ timeout: 50 })) {
          await dimissButton.click();
        }
      });

      editorPanel = page.locator(
        'div[role="tabpanel"]:has-text("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin mole")'
      );
      await expect(editorPanel).toBeVisible();

      testInfo.attachments.push(
        benchmark.addAttachment({
          ...attachmentCommon,
          test: 'close',
          time: closeTime
        })
      );
    });
  }
});
