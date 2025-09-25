// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, IJupyterLabPageFixture, test } from '@jupyterlab/galata';

const CELL_EDITOR_SELECTOR = '.jp-InputArea-editor';
const DEBUG_CONSOLE_SELECTOR = '.jp-DebugConsole';
const DEBUG_CONSOLE_WIDGET_SELECTOR = '.jp-DebugConsole-widget';

async function setupDebuggerConsole(
  page: IJupyterLabPageFixture,
  tmpPath: string
) {
  // Create a new notebook
  await page.notebook.createNew();

  // Add some code with variables to debug
  await page.notebook.setCell(
    0,
    'code',
    `def test_function():
    user_count = 42
    welcome_message = "hello world"
    data_list = [1, 2, 3, 4, 5]
    return user_count, welcome_message, data_list

result = test_function()`
  );

  // Wait for kernel to be ready
  await page.getByText('Python 3 (ipykernel) | Idle').waitFor();

  // Enable debugger
  await page.debugger.switchOn();
  await page.waitForCondition(() => page.debugger.isOpen());

  // Set a breakpoint on line 2 (the x = 42 line)
  await page.notebook.waitForCellGutter(0);
  await page.notebook.clickCellGutter(0, 5);

  // Wait for breakpoint to be set
  await page.debugger.waitForBreakPoints();

  // Run the cell (non-blocking) to hit the breakpoint
  void page.notebook.runCell(0);

  // Wait for the debugger to stop at the breakpoint
  await page.debugger.waitForCallStack();

  // Try to wait for variables, but don't fail if they don't appear
  try {
    await page.debugger.waitForVariables();
  } catch (error) {
    console.warn('Variables not loaded, continuing with test:', error);
  }

  // Click the evaluate button in the callstack toolbar to open the debug console
  const evaluateButton = page.locator('jp-button[title*="Evaluate"]');
  await evaluateButton.click();
  await page.locator(DEBUG_CONSOLE_SELECTOR).waitFor({ state: 'visible' });
}

test.describe('Debugger Console', () => {
  test.afterEach(async ({ page }) => {
    try {
      // Try to switch off debugger if it's still active
      if (await page.debugger.isOn()) {
        await page.debugger.switchOff();
        await page.waitForTimeout(500);
      }
    } catch (error) {
      // Ignore errors during cleanup - page might already be closed
      console.warn('Debugger cleanup failed:', error);
    }

    try {
      // Try to close notebook if it's still open
      await page.notebook.close();
    } catch (error) {
      // Ignore errors during cleanup - page might already be closed
      console.warn('Notebook cleanup failed:', error);
    }
  });

  test('Debug console toggles when evaluate button is clicked', async ({
    page,
    tmpPath
  }) => {
    await setupDebuggerConsole(page, tmpPath);

    // Verify debug console is visible (already opened by setupDebuggerConsole)
    const debugConsole = page.locator(DEBUG_CONSOLE_SELECTOR);
    await expect(debugConsole).toBeVisible();

    // Get the evaluate button
    const evaluateButton = page.locator('jp-button[title*="Evaluate"]');
    await expect(evaluateButton).toBeVisible();

    // Click the evaluate button to close the console
    await evaluateButton.click();
    await page.waitForTimeout(500);

    // Verify the console is now closed
    await expect(debugConsole).not.toBeVisible();

    // Click the evaluate button again to reopen the console
    await evaluateButton.click();
    await page.waitForTimeout(500);

    // Verify the console is open again
    await expect(debugConsole).toBeVisible();

    // Check that the debug console widget is present
    const debugConsoleWidget = debugConsole.locator(
      DEBUG_CONSOLE_WIDGET_SELECTOR
    );
    await expect(debugConsoleWidget).toBeVisible();

    // Verify the console has a prompt cell ready for input
    const promptCell = debugConsoleWidget.locator('.jp-CodeConsole-promptCell');
    await expect(promptCell).toBeVisible();
  });

  test('Debug evaluation returns correct values for local variables', async ({
    page,
    tmpPath
  }) => {
    await setupDebuggerConsole(page, tmpPath);

    // Focus on the debug console input
    const debugConsoleWidget = page.locator(DEBUG_CONSOLE_WIDGET_SELECTOR);
    const promptCell = debugConsoleWidget.locator('.jp-CodeConsole-promptCell');
    const inputArea = promptCell.locator(CELL_EDITOR_SELECTOR);

    await inputArea.click();
    await inputArea.waitFor();

    // Evaluate local variable 'user_count'
    await inputArea.type('user_count');
    await inputArea.press('Shift+Enter');

    // Wait for output to appear
    await page.waitForTimeout(1000);

    // Check that the output shows the correct value (42)
    const outputArea = debugConsoleWidget
      .locator('.jp-OutputArea-child')
      .last();
    await expect(outputArea).toContainText('42');
  });

  test('Debug evaluation returns correct values for expressions', async ({
    page,
    tmpPath
  }) => {
    await setupDebuggerConsole(page, tmpPath);

    // Focus on the debug console input
    const debugConsoleWidget = page.locator(DEBUG_CONSOLE_WIDGET_SELECTOR);
    const promptCell = debugConsoleWidget.locator('.jp-CodeConsole-promptCell');
    const inputArea = promptCell.locator(CELL_EDITOR_SELECTOR);

    await inputArea.click();
    await inputArea.waitFor();

    // Evaluate an expression using local variables
    await inputArea.type('user_count + 10');
    await inputArea.press('Shift+Enter');

    // Wait for output to appear
    await page.waitForTimeout(1000);

    // Check that the output shows the correct value (52)
    const outputArea = debugConsoleWidget
      .locator('.jp-OutputArea-child')
      .last();
    await expect(outputArea).toContainText('52');
  });

  test('Debug evaluation works with complex data structures', async ({
    page,
    tmpPath
  }) => {
    await setupDebuggerConsole(page, tmpPath);

    // Focus on the debug console input
    const debugConsoleWidget = page.locator(DEBUG_CONSOLE_WIDGET_SELECTOR);
    const promptCell = debugConsoleWidget.locator('.jp-CodeConsole-promptCell');
    const inputArea = promptCell.locator(CELL_EDITOR_SELECTOR);

    await inputArea.click();
    await inputArea.waitFor();

    // Evaluate list variable 'data_list'
    await inputArea.type('data_list');
    await inputArea.press('Shift+Enter');

    // Wait for output to appear
    await page.waitForTimeout(1000);

    // Check that the output shows the list
    const outputArea = debugConsoleWidget
      .locator('.jp-OutputArea-child')
      .last();
    await expect(outputArea).toContainText('[1, 2, 3, 4, 5]');
  });

  test('Tab completion works with language methods', async ({
    page,
    tmpPath
  }) => {
    await setupDebuggerConsole(page, tmpPath);

    // Focus on the debug console input
    const debugConsoleWidget = page.locator(DEBUG_CONSOLE_WIDGET_SELECTOR);
    const promptCell = debugConsoleWidget.locator('.jp-CodeConsole-promptCell');
    const inputArea = promptCell.locator(CELL_EDITOR_SELECTOR);

    await inputArea.click();
    await inputArea.waitFor();

    await inputArea.type('welcome_message.');
    await inputArea.press('Tab');
    await page.waitForTimeout(1000);

    // Find the visible completer and interact with it
    const visibleCompleter = page
      .locator('.jp-Completer:not(.lm-mod-hidden)')
      .first();
    await expect(visibleCompleter).toBeVisible();

    // Verify completion suggestions include built-in functions
    const completionItems = visibleCompleter.locator('.jp-Completer-item');
    await expect(completionItems.first()).toBeVisible();

    // Check that string method completions are available
    const stringCompletion = completionItems.filter({ hasText: 'capitalize' });
    await expect(stringCompletion).toBeVisible();

    // Select the completion
    await stringCompletion.click();

    // Verify the completion was applied
    await expect(inputArea).toContainText('capitalize');
  });

  test('Tab completion works with local variables', async ({
    page,
    tmpPath
  }) => {
    await setupDebuggerConsole(page, tmpPath);

    // Focus on the debug console input
    const debugConsoleWidget = page.locator(DEBUG_CONSOLE_WIDGET_SELECTOR);
    const promptCell = debugConsoleWidget.locator('.jp-CodeConsole-promptCell');
    const inputArea = promptCell.locator(CELL_EDITOR_SELECTOR);

    await inputArea.click();
    await inputArea.waitFor();

    // Type 'user_' and trigger completion
    await inputArea.type('user_');
    await inputArea.press('Tab');
    await page.waitForTimeout(1000);

    // Find the visible completer and interact with it
    const visibleCompleter = page
      .locator('.jp-Completer:not(.lm-mod-hidden)')
      .first();
    await expect(visibleCompleter).toBeVisible();

    // Verify completion suggestions include local variables
    const completionItems = visibleCompleter.locator('.jp-Completer-item');
    await expect(completionItems.first()).toBeVisible();

    // Check that 'user_count' completion is available
    const userCountCompletion = completionItems.filter({
      hasText: 'user_count'
    });
    await expect(userCountCompletion).toBeVisible();

    // Select the completion
    await userCountCompletion.click();

    // Verify the completion was applied
    await expect(inputArea).toContainText('user_count');
  });

  test('Debug evaluation shows error when debugger has no stopped threads', async ({
    page,
    tmpPath
  }) => {
    await setupDebuggerConsole(page, tmpPath);

    // Click the Continue button to resume execution (no more stopped threads)
    const continueButton = page.locator('jp-button[title*="Continue"]');
    await expect(continueButton).toBeVisible();
    await continueButton.click();

    // Wait a moment for the debugger to continue
    await page.waitForTimeout(1000);

    // Focus on the debug console input
    const debugConsoleWidget = page.locator(DEBUG_CONSOLE_WIDGET_SELECTOR);
    const promptCell = debugConsoleWidget.locator('.jp-CodeConsole-promptCell');
    const inputArea = promptCell.locator(CELL_EDITOR_SELECTOR);

    await inputArea.click();
    await inputArea.waitFor();

    // Try to evaluate some code when debugger has no stopped threads
    await inputArea.type('user_count');
    await inputArea.press('Shift+Enter');

    // Wait for output to appear
    await page.waitForTimeout(1000);

    // Check that the output shows the error message
    const outputArea = debugConsoleWidget
      .locator('.jp-OutputArea-child')
      .last();
    await expect(outputArea).toContainText(
      'Debugger does not have stopped threads - cannot evaluate'
    );
  });

  test('Debug console allows variable modification', async ({
    page,
    tmpPath
  }) => {
    await setupDebuggerConsole(page, tmpPath);

    // Focus on the debug console input
    const debugConsoleWidget = page.locator(DEBUG_CONSOLE_WIDGET_SELECTOR);
    const promptCell = debugConsoleWidget.locator('.jp-CodeConsole-promptCell');
    const inputArea = promptCell.locator(CELL_EDITOR_SELECTOR);

    await inputArea.click();
    await inputArea.waitFor();

    // First, verify the original value
    await inputArea.type('user_count');
    await inputArea.press('Shift+Enter');
    await page.waitForTimeout(1000);

    let outputArea = debugConsoleWidget.locator('.jp-OutputArea-child').last();
    await expect(outputArea).toContainText('42');

    // Modify the variable
    await inputArea.click();
    await inputArea.type('user_count = 100');
    await inputArea.press('Shift+Enter');
    await page.waitForTimeout(1000);

    // Verify the variable now has the new value
    await inputArea.click();
    await inputArea.type('user_count');
    await inputArea.press('Shift+Enter');
    await page.waitForTimeout(1000);

    outputArea = debugConsoleWidget.locator('.jp-OutputArea-child').last();
    await expect(outputArea).toContainText('100');

    // Modify another variable
    await inputArea.click();
    await inputArea.type('welcome_message = "modified message"');
    await inputArea.press('Shift+Enter');
    await page.waitForTimeout(1000);

    // Verify the modification
    await inputArea.click();
    await inputArea.type('welcome_message');
    await inputArea.press('Shift+Enter');
    await page.waitForTimeout(1000);

    outputArea = debugConsoleWidget.locator('.jp-OutputArea-child').last();
    await expect(outputArea).toContainText('modified message');
  });

  test('Debug console allows function calls and complex expressions', async ({
    page,
    tmpPath
  }) => {
    await setupDebuggerConsole(page, tmpPath);

    // Focus on the debug console input
    const debugConsoleWidget = page.locator(DEBUG_CONSOLE_WIDGET_SELECTOR);
    const promptCell = debugConsoleWidget.locator('.jp-CodeConsole-promptCell');
    const inputArea = promptCell.locator(CELL_EDITOR_SELECTOR);

    await inputArea.click();
    await inputArea.waitFor();

    // Test function call
    await inputArea.type('len(data_list)');
    await inputArea.press('Shift+Enter');
    await page.waitForTimeout(1000);

    let outputArea = debugConsoleWidget.locator('.jp-OutputArea-child').last();
    await expect(outputArea).toContainText('5');

    // Test complex expression
    await inputArea.click();
    await inputArea.type('user_count * 2 + len(welcome_message)');
    await inputArea.press('Shift+Enter');
    await page.waitForTimeout(1000);

    outputArea = debugConsoleWidget.locator('.jp-OutputArea-child').last();
    await expect(outputArea).toContainText('95'); // 42 * 2 + 11 = 95

    // Test list comprehension
    await inputArea.click();
    await inputArea.type('[x * 2 for x in data_list]');
    await inputArea.press('Shift+Enter');
    await page.waitForTimeout(1000);

    outputArea = debugConsoleWidget.locator('.jp-OutputArea-child').last();
    await expect(outputArea).toContainText('[2, 4, 6, 8, 10]');

    // Test string methods
    await inputArea.click();
    await inputArea.type('welcome_message.upper()');
    await inputArea.press('Shift+Enter');
    await page.waitForTimeout(1000);

    outputArea = debugConsoleWidget.locator('.jp-OutputArea-child').last();
    await expect(outputArea).toContainText('HELLO WORLD');
  });
});
