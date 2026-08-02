// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@playwright/test';
import { benchmark, galata } from '@jupyterlab/galata';
import type * as nbformat from '@jupyterlab/nbformat';

const tmpPath = 'test-performance-resize';
const printNotebook = 'print_output_notebook.ipynb';
const displayNotebook = 'display_output_notebook.ipynb';

const N_OUTPUTS = 10_000;

const SHELL_PLUGIN = '@jupyterlab/application-extension:shell';

const modes: Record<string, boolean> = {
  optimized: true,
  unoptimized: false
};

const parameters: [string, boolean, number][] = (
  [] as [string, boolean, number][]
).concat(
  ...Object.entries(modes).map(([name, optimizeResize]) =>
    new Array<number>(benchmark.nSamples)
      .fill(0)
      .map((_, i): [string, boolean, number] => [name, optimizeResize, i])
  )
);

test.describe('Benchmark - Notebook Resize', () => {
  test.beforeAll(async ({ request }) => {
    const content = galata.newContentsHelper(request);

    const printOutput: nbformat.IOutput[] = [
      {
        output_type: 'stream',
        name: 'stdout',
        text: 'qwertyuiopasdfghjklzxcvbnm\n'.repeat(N_OUTPUTS)
      }
    ];
    const printContent = galata.Notebook.generateNotebook(
      1,
      'code',
      ['for i in range(10**4):\n    print("qwertyuiopasdfghjklzxcvbnm")'],
      printOutput
    );
    await content.uploadContent(
      JSON.stringify(printContent),
      'text',
      `${tmpPath}/${printNotebook}`
    );

    const displayOutputs: nbformat.IOutput[] = Array.from(
      { length: N_OUTPUTS },
      () => ({
        output_type: 'display_data',
        data: { 'text/plain': "'qwertyuiopasdfghjklzxcvbnm'" },
        metadata: {}
      })
    );
    const displayContent = galata.Notebook.generateNotebook(
      1,
      'code',
      ['for i in range(10**4):\n    display("qwertyuiopasdfghjklzxcvbnm")'],
      displayOutputs
    );
    await content.uploadContent(
      JSON.stringify(displayContent),
      'text',
      `${tmpPath}/${displayNotebook}`
    );
  });

  test.beforeEach(async ({ page }) => {
    await galata.Mock.mockSettings(page, [], galata.DEFAULT_SETTINGS);
  });

  test.afterAll(async ({ request }) => {
    const content = galata.newContentsHelper(request);
    await content.deleteDirectory(tmpPath);
  });

  for (const [modeName, optimizeResize, sample] of parameters) {
    test(`measure notebook resize ${modeName} - ${sample + 1}`, async ({
      baseURL,
      browserName,
      page
    }, testInfo) => {
      test.setTimeout(300_000);

      // Override the shell setting for this mode before page loads.
      await galata.Mock.mockSettings(page, [], {
        ...galata.DEFAULT_SETTINGS,
        [SHELL_PLUGIN]: { optimizeResize }
      });

      const attachmentCommon = {
        nSamples: benchmark.nSamples,
        browser: browserName,
        file: `resize-side-by-side-${modeName}`,
        project: testInfo.project.name
      };
      const perf = galata.newPerformanceHelper(page);

      await page.goto(baseURL + '?reset');

      await page.click('#filebrowser >> .jp-BreadCrumbs-home', {
        timeout: 5000
      });
      await page.dblclick(`#filebrowser >> text=${tmpPath}`);

      await Promise.all([
        page.locator('[role="main"] >> .jp-SpinnerContent').waitFor(),
        page.dblclick(`#filebrowser >> text=${printNotebook}`)
      ]);
      await page
        .locator('[role="main"] >> .jp-SpinnerContent')
        .waitFor({ state: 'hidden' });

      await page.evaluate(
        async ([path]) => {
          await (window as any).jupyterapp.commands.execute('docmanager:open', {
            path,
            factory: 'Notebook',
            options: { mode: 'split-right' }
          });
        },
        [`${tmpPath}/${displayNotebook}`]
      );

      await page
        .locator(
          `div[role="main"] >> .lm-DockPanel-tabBar >> text=${displayNotebook}`
        )
        .waitFor();
      await page
        .locator('[role="main"] >> .jp-SpinnerContent')
        .waitFor({ state: 'hidden' });

      const handle = page.locator(
        '.lm-DockPanel-handle[data-orientation="horizontal"]:visible'
      );
      await handle.waitFor();

      const handleBox = await handle.boundingBox();
      expect(handleBox).not.toBeNull();
      const handleCenterX = handleBox!.x + handleBox!.width / 2;
      const handleCenterY = handleBox!.y + handleBox!.height / 2;

      const resizeTime = await perf.measure(async () => {
        await page.mouse.move(handleCenterX, handleCenterY);
        await page.mouse.down();
        await page.mouse.move(handleCenterX + 200, handleCenterY, {
          steps: 20
        });
        await page.mouse.move(handleCenterX, handleCenterY, { steps: 20 });
        await page.mouse.up();
      });

      testInfo.attachments.push(
        benchmark.addAttachment({
          ...attachmentCommon,
          test: 'resize',
          time: resizeTime
        })
      );
    });
  }
});
