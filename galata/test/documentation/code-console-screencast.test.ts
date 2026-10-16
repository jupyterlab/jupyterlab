// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ConsolePanel } from '@jupyterlab/console';
import { expect, galata, test } from '@jupyterlab/galata';
import * as fs from 'fs/promises';
import path from 'path';

const viewport = { width: 1280, height: 720 };
const screencastDirectory = process.env.GALATA_SCREENCAST_DIR;

test.use({
  mockState: { ...galata.DEFAULT_DOCUMENTATION_STATE },
  viewport,
  deviceScaleFactor: 1
});

if (screencastDirectory) {
  // Earlier trace/video capture would override the native screencast size.
  test.use({ trace: 'off', video: 'off' });
}

test('Create a code console from the Launcher', async ({ page }, testInfo) => {
  await page.sidebar.openTab('filebrowser');
  await page.sidebar.setWidth();
  expect(page.viewportSize()).toEqual(viewport);
  expect(await page.evaluate(() => window.devicePixelRatio)).toBe(1);

  let recording: string | undefined;
  if (screencastDirectory) {
    await fs.mkdir(screencastDirectory, { recursive: true });
    const directory = await fs.realpath(screencastDirectory);
    const runnerOutput = await fs.realpath(testInfo.project.outputDir);
    const relative = path.relative(runnerOutput, directory);
    if (
      relative === '' ||
      (relative !== '..' &&
        !relative.startsWith(`..${path.sep}`) &&
        !path.isAbsolute(relative))
    ) {
      throw new Error(
        'GALATA_SCREENCAST_DIR must be outside the Playwright output directory.'
      );
    }
    const output = await fs.mkdtemp(
      path.join(directory, 'code_console_create-')
    );
    recording = path.join(output, 'code_console_create-incomplete.webm');
    await page.screencast.start({ path: recording, size: viewport });
  }

  try {
    if (recording) {
      await page.screencast.showActions({
        cursor: 'pointer',
        style: { title: 'display: none' }
      });
      await page.screencast.showChapter('Create a code console', {
        description: 'Click + in the File Browser to open the Launcher.'
      });
    }
    await page
      .locator('#filebrowser')
      .getByRole('button', { name: /^New Launcher\b/ })
      .click();

    const consoleSection = page.locator('.jp-Launcher-section').filter({
      has: page.getByRole('heading', { name: 'Console', exact: true })
    });
    const python = consoleSection
      .getByRole('button')
      .filter({ hasText: /^Python\b/ })
      .first();
    await expect(python).toBeVisible();
    if (recording) {
      await page.screencast.showChapter('Choose a Console kernel', {
        description: 'Select Python in the Console section.'
      });
    }
    await python.click();

    await expect(
      page.locator('.jp-CodeConsole-input .cm-content')
    ).toBeVisible();
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const widget = window.galata.app.shell.currentWidget;
            if (!widget?.hasClass('jp-ConsolePanel')) {
              return null;
            }
            const kernel = (widget as ConsolePanel).sessionContext.session
              ?.kernel;
            return kernel
              ? { connection: kernel.connectionStatus, status: kernel.status }
              : null;
          }),
        { timeout: testInfo.timeout }
      )
      .toEqual({ connection: 'connected', status: 'idle' });

    if (recording) {
      await page.screencast.showChapter('The console is ready', {
        description:
          'The input is visible and the kernel is connected and idle.'
      });
    }
  } finally {
    if (recording) {
      await page.screencast.stop();
    }
  }

  if (recording) {
    await fs.rename(
      recording,
      path.join(path.dirname(recording), 'code_console_create.webm')
    );
  }
});
