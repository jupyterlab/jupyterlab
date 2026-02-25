// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IJupyterLabPageFixture } from '@jupyterlab/galata';
import { expect, galata, test } from '@jupyterlab/galata';
import type { Locator } from '@playwright/test';

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

    const initialHeight = await getStabilisedHeight(page, codeConsoleInput);
    expect(initialHeight).toBeGreaterThan(0);

    const multiLineCode = `def hello_world():
print("Hello")
print("World")
return "Done"`;

    await page.keyboard.type(multiLineCode);

    const afterTypingHeight = await getStabilisedHeight(page, codeConsoleInput);
    expect(afterTypingHeight).toBeGreaterThan(0);
    expect(afterTypingHeight).toBeGreaterThan(initialHeight);
  });

  test('Input prompt auto-resize works with paste operations', async ({
    page
  }) => {
    const codeConsoleInput = page.locator('.jp-CodeConsole-input');

    const initialHeight = await getStabilisedHeight(page, codeConsoleInput);
    expect(initialHeight).toBeGreaterThan(0);

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

    const afterPasteHeight = await getStabilisedHeight(page, codeConsoleInput);
    expect(afterPasteHeight).toBeGreaterThan(0);
    expect(afterPasteHeight).toBeGreaterThan(initialHeight);
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

    // Since neither paste, nor initialization of CodeMirror editor
    // (after moving the prompt position) is instantaneous, we only
    // record height once it stabilised for both before and after.

    await page.keyboard.press('ControlOrMeta+v');

    const heightAtBottom = await getStabilisedHeight(page, codeConsoleInput);
    expect(heightAtBottom).toBeGreaterThan(0);

    await page.getByLabel('Change Console Prompt Position').first().click();
    await page.getByText('Prompt to top').click();

    const heightAtTop = await getStabilisedHeight(page, codeConsoleInput);
    expect(heightAtTop).toBeGreaterThan(0);

    expect(heightAtTop).toBeCloseTo(heightAtBottom, 1);
  });

  test('Input prompt continues to auto-resize after code execution', async ({
    page
  }) => {
    const codeConsoleInput = page.locator('.jp-CodeConsole-input');

    const initialHeight = await getStabilisedHeight(page, codeConsoleInput);
    expect(initialHeight).toBeGreaterThan(0);

    const multiLineCode = `def test_function():
    print("Line 1")
    print("Line 2")
    return "Done"`;

    await page.keyboard.type(multiLineCode);

    const heightBeforeExecution = await getStabilisedHeight(
      page,
      codeConsoleInput
    );
    expect(heightBeforeExecution).toBeGreaterThan(0);
    expect(heightBeforeExecution).toBeGreaterThan(initialHeight);

    // Execute the code
    await page.keyboard.press('Shift+Enter');

    await page.locator('text=| Idle').waitFor();

    // Check that the new empty input cell has shrunk back to original size
    const heightAfterExecution = await getStabilisedHeight(
      page,
      codeConsoleInput
    );
    expect(heightAfterExecution).toBeGreaterThan(0);
    expect(heightAfterExecution).toBe(initialHeight);

    // Type new multi-line code in the new prompt cell
    const moreCode = `import os
import sys
print("Testing auto-resize")
print("After execution")`;

    await page.keyboard.type(moreCode);

    const heightAfterTyping = await getStabilisedHeight(page, codeConsoleInput);
    expect(heightAfterTyping).toBeGreaterThan(0);

    // The input should have grown again for the new multi-line content
    expect(heightAfterTyping).toBeGreaterThan(heightAfterExecution!);
  });

  test('Input prompt shrinks when content is cleared', async ({ page }) => {
    const codeConsoleInput = page.locator('.jp-CodeConsole-input');

    const initialHeight = await getStabilisedHeight(page, codeConsoleInput);
    expect(initialHeight).toBeGreaterThan(0);

    const multiLineCode = `def multi_line_function():
    print("This is line 1")
    print("This is line 2")
    print("This is line 3")
    for i in range(5):
        print(f"Loop iteration {i}")
    return "Finished"`;

    await page.keyboard.type(multiLineCode);

    const expandedHeight = await getStabilisedHeight(page, codeConsoleInput);
    expect(expandedHeight).toBeGreaterThan(0);
    expect(expandedHeight).toBeGreaterThan(initialHeight);

    // Clear the input using Ctrl+A followed by Delete
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');

    const shrunkHeight = await getStabilisedHeight(page, codeConsoleInput);
    expect(shrunkHeight).toBeGreaterThan(0);
    expect(shrunkHeight).toBe(initialHeight);
  });
});

async function getStabilisedHeight(
  page: IJupyterLabPageFixture,
  element: Locator
) {
  // Wait for the height to stabilize over 100ms
  let lastBox: { height: number } | null = null;
  let currentBox: { height: number } | null = null;
  let attempts = 0;
  do {
    lastBox = currentBox;
    await page.waitForTimeout(100);
    currentBox = await element.boundingBox();
    attempts += 1;
    if (attempts >= 100) {
      throw new Error('Height did not stabilize after 100 attempts');
    }
  } while (!(currentBox && lastBox && currentBox.height === lastBox.height));
  return currentBox.height;
}
