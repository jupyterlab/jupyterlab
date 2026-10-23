// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect,
  type Locator,
  type Page,
  type Response
} from '@playwright/test';

const TERMINAL_SELECTOR = '.jp-Terminal';
const TERMINAL_BODY_SELECTOR = '.jp-Terminal-body';
const TERMINAL_INPUT_SELECTOR = '[aria-label="Terminal input"]';
const TERMINAL_SCREEN_SELECTOR = '.xterm-screen';
const TERMINAL_TITLES_STATE_DB_ID = '@jupyterlab/terminal-extension:titles';

/**
 * Terminal helpers
 */
export class TerminalHelper {
  constructor(readonly page: Page) {}

  /**
   * JupyterLab terminal widgets.
   */
  get locator(): Locator {
    return this.page.locator(TERMINAL_SELECTOR);
  }

  /**
   * Run a shell command in a terminal.
   *
   * @param command Shell command to run
   * @param options Command options
   */
  async runCommand(
    command: string,
    options: TerminalHelper.IRunCommandOptions = {}
  ): Promise<void> {
    const terminal = options.terminal ?? this.locator;
    await terminal.waitFor({ state: 'visible' });
    await terminal.locator(TERMINAL_SCREEN_SELECTOR).click();

    const terminalInput = terminal.locator(TERMINAL_INPUT_SELECTOR);
    await terminalInput.waitFor({ state: 'attached' });
    await expect(terminalInput).toBeFocused();

    await this.page.keyboard.type(command);
    if (options.verify) {
      await expect(terminal.locator(TERMINAL_BODY_SELECTOR)).toContainText(
        command
      );
    }
    await this.page.keyboard.press('Enter');
  }

  /**
   * Set the title of a terminal.
   *
   * @param title New terminal title
   * @param options Title options
   */
  async setTitle(
    title: string,
    options: TerminalHelper.ISetTitleOptions = {}
  ): Promise<void> {
    let command: string;
    if (process.platform === 'win32') {
      const escapedTitle = title.replace(/"/g, '""').replace(/'/g, "''");
      // `host.UI.RawUI.WindowTitle` works on PowerShell, `title` works on cmd.exe.
      command = `powershell -Command "\"$host.UI.RawUI.WindowTitle='${escapedTitle}'\"" 2>nul || title ${escapedTitle}`;
    } else {
      const escapedTitle = title.replace(/'/g, `'\\''`);
      command = `PROMPT_COMMAND='printf "\\033]0;${escapedTitle}\\007"'`;
    }
    await this.runCommand(command, { terminal: options.terminal });
  }

  /**
   * Wait until a terminal title has been saved to the workspace state.
   *
   * @param title Terminal title
   * @param options Wait options
   */
  async waitForTitleSaved(
    title: string,
    options: TerminalHelper.IWaitForTitleSavedOptions = {}
  ): Promise<void> {
    await this.page.waitForResponse(
      response => {
        return (
          response.ok() &&
          response.request().method() === 'PUT' &&
          response.url().includes('/api/workspaces/') &&
          Private.workspaceSaveIncludesTitle(response, title)
        );
      },
      { timeout: options.timeout }
    );
  }
}

/**
 * A namespace for TerminalHelper statics.
 */
export namespace TerminalHelper {
  /**
   * Options for running a terminal command.
   */
  export interface IRunCommandOptions {
    /**
     * Terminal locator. Defaults to all terminal widgets.
     */
    terminal?: Locator;

    /**
     * Whether to verify the command text was echoed before pressing Enter.
     */
    verify?: boolean;
  }

  /**
   * Options for setting a terminal title.
   */
  export interface ISetTitleOptions {
    /**
     * Terminal locator. Defaults to all terminal widgets.
     */
    terminal?: Locator;
  }

  /**
   * Options for waiting for a terminal title to be saved.
   */
  export interface IWaitForTitleSavedOptions {
    /**
     * Maximum wait time in milliseconds.
     */
    timeout?: number;
  }
}

namespace Private {
  export function workspaceSaveIncludesTitle(
    response: Response,
    title: string
  ): boolean {
    let state: unknown;
    try {
      state = response.request().postDataJSON().data?.[
        TERMINAL_TITLES_STATE_DB_ID
      ];
    } catch {
      return false;
    }

    return (
      typeof state === 'object' &&
      state !== null &&
      !Array.isArray(state) &&
      Object.values(state).includes(title)
    );
  }
}
