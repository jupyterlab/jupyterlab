/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ElementHandle, Page } from '@playwright/test';
import { SidebarHelper } from './sidebar';
import { NotebookHelper } from './notebook';
import { waitForCondition } from '../utils';

const DEBUGGER_ITEM = 'debugger-icon';

/**
 * Debugger Helper
 */
export class DebuggerHelper {
  constructor(
    readonly page: Page,
    readonly sidebar: SidebarHelper,
    readonly notebook: NotebookHelper
  ) {}

  /**
   * Returns true if debugger toolbar item is enabled, false otherwise
   */
  async isOn(): Promise<boolean> {
    if (!(await this.notebook.isAnyActive())) {
      return false;
    }
    const item = await this.notebook.getToolbarItem(DEBUGGER_ITEM);
    if (item) {
      const button = await item.$('button');
      if (button) {
        return (await button.getAttribute('aria-pressed')) === 'true';
      }
    }
    return false;
  }

  /**
   * Enables the debugger toolbar item
   */
  async switchOn(): Promise<void> {
    await waitForCondition(async () => {
      const item = await this.notebook.getToolbarItem(DEBUGGER_ITEM);
      if (item) {
        const button = await item.$('button');
        if (button) {
          return (await button.getAttribute('aria-disabled')) !== 'true';
        }
      }
      return false;
    }, 2000);
    if (!(await this.isOn())) {
      await this.notebook.clickToolbarItem(DEBUGGER_ITEM);
    }
  }

  /**
   * Disables the debugger toolbar item
   */
  async switchOff(): Promise<void> {
    if (await this.isOn()) {
      await this.notebook.clickToolbarItem(DEBUGGER_ITEM);
    }
  }

  /**
   *  Returns true if debugger panel is open, false otherwise
   */
  async isOpen(): Promise<boolean> {
    return await this.sidebar.isTabOpen('jp-debugger-sidebar');
  }

  /**
   * Returns handle to the variables panel content
   */
  async getVariablesPanel(): Promise<ElementHandle<Element> | null> {
    return this._getPanel('.jp-DebuggerVariables');
  }

  /**
   * Waits for variables to be populated in the variables panel
   */
  async waitForVariables(): Promise<void> {
    await this.page.waitForSelector('.jp-DebuggerVariables-body ul');
  }

  /**
   * render variable
   */
  async renderVariable(name: string): Promise<void> {
    await this.page
      .locator(`.jp-DebuggerVariables :text("${name}")`)
      .click({ button: 'right' });
    await this.page
      .locator('.lm-Menu-itemLabel:text("Render Variable")')
      .click();
    await this.page.waitForSelector('.jp-VariableRendererPanel-renderer');
  }

  /**
   * Returns handle to callstack panel content
   */
  async getCallStackPanel(): Promise<ElementHandle<Element> | null> {
    return this._getPanel('.jp-DebuggerCallstack');
  }

  /**
   * Waits for the callstack body to populate in the callstack panel
   */
  async waitForCallStack(): Promise<void> {
    await this.page.waitForSelector(
      '.jp-DebuggerCallstack-body >> .jp-DebuggerCallstackFrame'
    );
  }

  /**
   * Returns handle to breakpoints panel content
   */
  async getBreakPointsPanel(): Promise<ElementHandle<Element> | null> {
    return this._getPanel('.jp-DebuggerBreakpoints');
  }

  /**
   * Waits for the breakpoints to appear in the breakpoints panel
   */
  async waitForBreakPoints(): Promise<void> {
    await this.page.waitForSelector(
      '.jp-DebuggerBreakpoints >> .jp-DebuggerBreakpoint'
    );
  }

  /**
   * Returns handle to sources panel content
   */
  async getSourcePanel(): Promise<ElementHandle<Element> | null> {
    return this._getPanel('.jp-DebuggerSources');
  }

  /**
   * Waits for sources to be populated in the sources panel
   */
  async waitForSources(): Promise<void> {
    await this.page.waitForSelector('.jp-DebuggerSources-body >> .jp-Editor', {
      state: 'visible'
    });
  }

  private async _getPanel(
    selector: string
  ): Promise<ElementHandle<Element> | null> {
    const panel = await this.sidebar.getContentPanel('right');
    if (panel) {
      return panel.$(selector);
    }
    return null;
  }
}
