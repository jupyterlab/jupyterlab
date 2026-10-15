// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import path from 'path';

const screencastDirectory = process.env.GALATA_SCREENCAST_DIR;
const viewport = { width: 1280, height: 720 };

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  viewport,
  deviceScaleFactor: 1
});

if (screencastDirectory) {
  // Other recordings can take precedence over the screencast dimensions.
  test.use({ video: 'off', trace: 'off' });
}

test('Create a code console from the Launcher', async ({ page }) => {
  await page.goto();
  await page.addStyleTag({
    content: '.jp-LabShell.jp-mod-devMode { border-top: none; }'
  });
  await page.sidebar.openTab('filebrowser');
  await page.sidebar.setWidth();

  const newLauncher = page
    .locator('.jp-FileBrowser-toolbar')
    .getByRole('button', { name: /^New Launcher/ })
    .describe('the + button in the file browser');
  await expect(newLauncher).toBeVisible();

  if (screencastDirectory) {
    await page.screencast.start({
      path: path.resolve(screencastDirectory, 'code_console_create.webm'),
      size: viewport
    });
  }

  try {
    if (screencastDirectory) {
      await page.screencast.showActions({ cursor: 'pointer', duration: 1500 });
      await page.screencast.showChapter('Create a code console', {
        description: 'Click + in the file browser to open the Launcher.'
      });
    }

    await newLauncher.click();
    await expect(page.activity.launcher.last()).toHaveAttribute(
      'aria-selected',
      'true'
    );

    if (screencastDirectory) {
      await page.screencast.showChapter('Choose a kernel', {
        description: 'Select Python 3 in the Console section.'
      });
    }

    await page
      .locator('.jp-Launcher:visible .jp-LauncherCard[data-category="Console"]')
      .filter({ hasText: 'Python 3 (ipykernel)' })
      .describe('Python 3 in the Console section')
      .click();

    const codeConsole = page.locator('.jp-CodeConsole');
    const prompt = codeConsole
      .locator('.jp-CodeConsole-input .cm-content')
      .describe('the code console prompt');
    await expect(codeConsole).toBeVisible();
    await expect(page.getByText('Python 3 (ipykernel) | Idle')).toBeVisible();
    await expect(prompt).toBeEditable();

    if (screencastDirectory) {
      await page.screencast.showChapter('Your console is ready', {
        description: 'Enter code at the prompt.'
      });
    }

    await prompt.click();
    await expect(prompt).toBeFocused();
  } finally {
    if (screencastDirectory) {
      await page.screencast.stop();
    }
  }
});
