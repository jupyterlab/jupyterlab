// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { Locator, Page } from '@playwright/test';

/**
 * Terminal helpers
 */
export class TerminalHelper {
  constructor(readonly page: Page) {}

  /**
   * Run a command in a terminal widget.
   *
   * This clicks the terminal to ensure it has focus, types the given command,
   * and presses Enter to execute it.
   *
   * To reliably wait for the output, enable `screenReaderMode` in the terminal
   * settings (via `test.use({ mockSettings: { '@jupyterlab/terminal-extension:plugin':
   * { screenReaderMode: true } } })`) and then assert:
   * ```
   * await expect(terminalLocator).toContainText(expectedOutput);
   * ```
   *
   * @param terminalLocator Locator for the terminal panel (`.jp-Terminal`)
   * @param command Shell command to run
   */
  async runCommand(terminalLocator: Locator, command: string): Promise<void> {
    await terminalLocator.click();
    await this.page.keyboard.type(command);
    await this.page.keyboard.press('Enter');
  }
}
