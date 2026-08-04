// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { galata, test } from '@jupyterlab/galata';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

const DEFAULT_NAME = 'untitled.py';

const TEST_FILE_CONTENT = `first
second
third`;

test.beforeEach(async ({ page }) => {
  await page.menu.clickMenuItem('File>New>Python File');
  await page.locator(`[role="main"] >> text=${DEFAULT_NAME}`).waitFor();
  await page.locator('[role="main"] .cm-content').fill(TEST_FILE_CONTENT);
});

test.describe('File Edit Operations', () => {
  test('Should remove a line on Control + D', async ({ page }) => {
    await page.getByRole('textbox').getByText('second').last().dblclick();
    await page.keyboard.press('Control+d');
    expect(await getEditorText(page)).toBe('first\nthird');
  });
  test('Should toggle line comment on Control + /', async ({ page }) => {
    // Select "second" and "third"
    await page.getByRole('textbox').getByText('second').last().dblclick();
    await page.keyboard.press('Shift+ArrowDown');
    // Toggle line comment
    await page.keyboard.press('Control+/');
    expect(await getEditorText(page)).toBe('first\n# second\n# third');
  });
  test('Should toggle a block comment on Alt + A', async ({ page }) => {
    const currentDir = await page.filebrowser.getCurrentDirectory();
    // Wait a short while as the file initializes before renaming, see
    // https://github.com/jupyterlab/jupyterlab/issues/18455
    await page.waitForTimeout(100);
    await page.contents.renameFile(
      `${currentDir}/${DEFAULT_NAME}`,
      `${currentDir}/untitled.js`
    );
    // Select "second" and "third"
    await page.getByRole('textbox').getByText('second').last().dblclick();
    await page.keyboard.press('Shift+ArrowDown');
    // Toggle block comment
    await page.keyboard.press('Alt+A');
    expect(await getEditorText(page)).toBe('first\n/* second\nthird */');
  });
  test('Should fall back to line comment on Alt + A for Python', async ({
    page
  }) => {
    // Python has no block comment syntax, so Alt+A should fall back to
    // line comments (via toggleBlockCommentWithFallback)
    // Select "second" and "third"
    await page.getByRole('textbox').getByText('second').last().dblclick();
    await page.keyboard.press('Shift+ArrowDown');
    // Toggle block comment (falls back to line comment for Python)
    await page.keyboard.press('Alt+A');
    expect(await getEditorText(page)).toBe('first\n# second\n# third');
  });
});

test.describe('Console Interactions', () => {
  test('Should send line to console on Shift + Enter before kernel starts', async ({
    page
  }) => {
    await page.locator('[role="main"] .cm-content').fill('123\n12');

    let delaySessionStart = true;
    let markSessionStartRequested: () => void = () => undefined;
    let releaseSessionStart: () => void = () => undefined;
    // Hold session creation so Shift+Enter is pressed while the console is pending.
    const sessionStartRequested = new Promise<void>(resolve => {
      markSessionStartRequested = resolve;
    });
    const sessionStartReleased = new Promise<void>(resolve => {
      releaseSessionStart = () => {
        resolve();
      };
    });
    await page.route(galata.Routes.sessions, async route => {
      if (route.request().method() === 'POST' && delaySessionStart) {
        delaySessionStart = false;
        markSessionStartRequested();
        await sessionStartReleased;
      }
      return route.fallback();
    });

    await page.evaluate(async () => {
      const app = window.jupyterapp;
      const widget = app.shell.currentWidget as {
        id: string;
        context: {
          contentsModel?: { name?: string };
          path: string;
        };
      };
      await app.commands.execute('console:create', {
        activate: false,
        name: widget.context.contentsModel?.name,
        path: widget.context.path,
        kernelPreference: {
          autoStartDefault: true,
          language: 'python'
        },
        ref: widget.id,
        insertMode: 'split-bottom'
      });
    });

    await sessionStartRequested;

    await page.getByText('123', { exact: true }).click();

    await page.keyboard.press('Shift+Enter');
    releaseSessionStart();

    await expect(
      page.getByLabel('Code Cell Content with Output').locator('span')
    ).toContainText('123');
  });
});

async function getEditorText(page: Page): Promise<string> {
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Control+C');
  try {
    await page.context().grantPermissions(['clipboard-read']);
  } catch {
    // Firefox does not support clipboard-read but does not need it either
  }
  const handle = await page.evaluateHandle(() =>
    navigator.clipboard.readText()
  );
  return await handle.jsonValue();
}
