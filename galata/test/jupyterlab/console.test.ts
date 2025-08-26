// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect,
  galata,
  IJupyterLabPageFixture,
  test
} from '@jupyterlab/galata';

const CELL_EDITOR_SELECTOR = '.jp-InputArea-editor';
const CODE_MIRROR_CURSOR = '.cm-cursor';
const EXECUTED_CELL = '[aria-label="Code Cell Content with Output"]';

async function setupConsole(page: IJupyterLabPageFixture) {
  await page.menu.clickMenuItem('File>New>Console');

  await page.click('button:has-text("Select")');

  await page.locator('[aria-label="Code Cell Content"]').waitFor();
  await page.locator('text=| Idle').waitFor();
}

test.describe('Console', () => {
  test.beforeEach(async ({ page }) => setupConsole(page));

  test('Executed cells should become read-only', async ({ page }) => {
    await page.keyboard.type('2 + 2');
    await page.keyboard.press('Shift+Enter');

    const executedCell = page.locator(EXECUTED_CELL);
    await executedCell.waitFor();

    const cellEditor = executedCell.locator(CELL_EDITOR_SELECTOR);
    expect(await cellEditor.innerText()).toBe('2 + 2');

    // Focus the editor
    await cellEditor.click();

    // Should not display the cursor
    const cursor = cellEditor.locator(CODE_MIRROR_CURSOR);
    await expect.soft(cursor).toBeHidden();

    // Try to type something into the editor
    await cellEditor.pressSequentially('more text');

    // Expect the editor content to not change
    expect(await cellEditor.innerText()).toBe('2 + 2');
  });
});

test.describe('Console (terminal mode)', () => {
  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/console-extension:tracker': {
        ...galata.DEFAULT_SETTINGS['@jupyterlab/console-extension:tracker'],
        interactionMode: 'terminal'
      }
    }
  });

  test.beforeEach(async ({ page }) => setupConsole(page));

  test('Cells get executed with Enter ', async ({ page }) => {
    await page.keyboard.type('2**22');
    await page.keyboard.press('Enter');

    const executedCell = page.locator(EXECUTED_CELL);
    await executedCell.waitFor();

    await expect(executedCell).toContainText('4194304');
  });
});

test.describe('Console Input Auto-Resize', () => {
  test.beforeEach(async ({ page }) => setupConsole(page));

  test('Input prompt auto-resizes with multiple lines of text', async ({
    page
  }) => {
    const codeConsoleInput = page.locator('.jp-CodeConsole-input');

    const initialHeight = await codeConsoleInput.boundingBox();
    expect(initialHeight).not.toBeNull();

    const multiLineCode = `def hello_world():
print("Hello")
print("World")
return "Done"`;

    await page.keyboard.type(multiLineCode);

    const afterTypingHeight = await codeConsoleInput.boundingBox();
    expect(afterTypingHeight).not.toBeNull();
    expect(afterTypingHeight!.height).toBeGreaterThan(initialHeight!.height);
  });

  test('Input prompt auto-resize works with paste operations', async ({
    page
  }) => {
    const codeConsoleInput = page.locator('.jp-CodeConsole-input');

    const initialHeight = await codeConsoleInput.boundingBox();
    expect(initialHeight).not.toBeNull();

    const pastedCode = `import numpy as np
import pandas as pd

data = pd.DataFrame({
    'x': [1, 2, 3, 4, 5],
    'y': [2, 4, 6, 8, 10]
})

print(data.head())`;

    await page.evaluate(async code => {
      await navigator.clipboard.writeText(code);
    }, pastedCode);

    await page.keyboard.press('ControlOrMeta+v');

    const afterPasteHeight = await codeConsoleInput.boundingBox();
    expect(afterPasteHeight).not.toBeNull();
    expect(afterPasteHeight!.height).toBeGreaterThan(initialHeight!.height);
  });

  test('Input prompt maintains auto-resize height when moved from bottom to top', async ({
    page
  }) => {
    const codeConsoleInput = page.locator('.jp-CodeConsole-input');

    const pastedCode = `def complex_function():
    for i in range(10):
        if i % 2 == 0:
            print(f"Even: {i}")
        else:
            print(f"Odd: {i}")
    return "Completed"`;

    await page.evaluate(async code => {
      await navigator.clipboard.writeText(code);
    }, pastedCode);

    await page.keyboard.press('ControlOrMeta+v');

    const heightAtBottom = await codeConsoleInput.boundingBox();
    expect(heightAtBottom).not.toBeNull();

    await page.getByLabel('Change Console Prompt Position').first().click();
    await page.getByText('Prompt to top').click();

    await page.waitForTimeout(500);

    const heightAtTop = await codeConsoleInput.boundingBox();
    expect(heightAtTop).not.toBeNull();
    expect(heightAtTop!.height).toBe(heightAtBottom!.height);
  });
});
