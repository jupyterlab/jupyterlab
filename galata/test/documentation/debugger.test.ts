// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect,
  galata,
  IJupyterLabPageFixture,
  test
} from '@jupyterlab/galata';
import { positionMouseOver } from './utils';

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  viewport: { height: 720, width: 1280 }
});

test.describe('Debugger', () => {
  test('Kernel capability', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    // Wait for kernel to settle on idle
    await page
      .locator('.jp-DebuggerBugButton[aria-disabled="false"]')
      .waitFor();
    await page
      .locator('.jp-Notebook-ExecutionIndicator[data-status="idle"]')
      .waitFor();

    expect(
      await page.screenshot({
        clip: { x: 1015, y: 62, width: 225, height: 32 }
      })
    ).toMatchSnapshot('debugger_kernel.png');
  });

  test('Activate', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());
    await page.sidebar.setWidth(251, 'right');

    expect(
      await page.screenshot({ clip: { y: 62, x: 765, width: 225, height: 32 } })
    ).toMatchSnapshot('debugger_activate.png');
  });

  test('Set breakpoint', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());
    await page.sidebar.setWidth(251, 'right');

    await setBreakpoint(page);

    // Wait for breakpoint to finish appearing
    await page.waitForTimeout(150);

    const breakpointIcon = page
      .locator('.jp-NotebookPanel-notebook')
      .first()
      .locator('.jp-Cell[data-windowed-list-index="0"]')
      .locator('.cm-gutter.cm-breakpoint-gutter .cm-gutterElement')
      .nth(2)
      .locator('span.cm-breakpoint-icon');

    await breakpointIcon.waitFor();
    expect(
      await page.screenshot({
        clip: { y: 100, x: 300, width: 300, height: 80 }
      })
    ).toMatchSnapshot('debugger_breakpoint.png');
  });

  test('Highlight run cell button', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    const runButton = await page
      .locator('.jp-Toolbar-item')
      .locator('[data-command="notebook:run-cell-and-select-next"]')
      .getByRole('button');

    // Inject mouse pointer
    await page.evaluate(
      ([mouse]) => {
        document.body.insertAdjacentHTML('beforeend', mouse);
      },
      [await positionMouseOver(runButton!)]
    );
    await runButton!.focus();
    await runButton!.focus();
    await runButton!.hover();

    expect(
      await page.screenshot({ clip: { y: 62, x: 400, width: 190, height: 60 } })
    ).toMatchSnapshot('debugger_run.png');
  });

  test('Stop on breakpoint', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());
    await page.sidebar.setWidth(251, 'right');

    await setBreakpoint(page);

    // Don't wait as it will be blocked
    void page.notebook.runCell(1);

    // Wait to be stopped on the breakpoint
    await page.debugger.waitForCallStack();

    expect(
      await page.screenshot({
        clip: { y: 100, x: 300, width: 300, height: 80 }
      })
    ).toMatchSnapshot('debugger_stop_on_breakpoint.png');

    await page.click('jp-button[title^=Continue]');
  });

  test('Breakpoints on exception', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());
    await page.sidebar.setWidth(251, 'right');

    await expect(
      page.locator('jp-button.jp-PauseOnExceptions')
    ).toHaveAttribute('aria-pressed', 'false');
    await page.locator('jp-button.jp-PauseOnExceptions').click();
    const menu = page.locator('.jp-PauseOnExceptions-menu');
    await expect(menu).toBeVisible();
    await expect(menu.locator('li.lm-Menu-item')).toHaveCount(3);
    await expect(menu.locator('li.lm-Menu-item.lm-mod-toggled')).toHaveCount(0);

    await menu
      .locator('li div.lm-Menu-itemLabel:text("userUnhandled")')
      .click();

    await expect(
      page.locator('jp-button.jp-PauseOnExceptions')
    ).toHaveAttribute('aria-pressed', 'true');

    await page.notebook.enterCellEditingMode(0);
    const keyboard = page.keyboard;
    await keyboard.press('Control+A');
    await keyboard.type('try:\n1/0\n', { delay: 100 });
    await keyboard.press('Backspace');
    await keyboard.type('except:\n2/0\n', { delay: 100 });

    void page.notebook.runCell(0);

    // Wait to be stopped on the breakpoint
    await page.debugger.waitForCallStack();
    // Wait for the red debug indicator box to appear
    const firstCell = (await page.notebook.getCellLocator(0))!;
    await firstCell.locator('.jp-DebuggerEditor-highlight').waitFor({
      state: 'visible',
      timeout: 1000
    });
    expect(
      await page.screenshot({
        clip: { y: 110, x: 300, width: 300, height: 80 }
      })
    ).toMatchSnapshot('debugger_stop_on_unhandled_exception.png');

    await page.click('jp-button[title^=Continue]');
    await page.notebook.waitForRun(0);

    await page.locator('jp-button.jp-PauseOnExceptions').click();

    await expect(menu.locator('li.lm-Menu-item.lm-mod-toggled')).toHaveCount(1);
    await expect(
      menu.locator('li:has(div.lm-Menu-itemLabel:text("userUnhandled"))')
    ).toHaveClass(/lm-mod-toggled/);

    await menu.locator('li div.lm-Menu-itemLabel:text("raised")').click();

    void page.notebook.runCell(0);

    // Wait to be stopped on the breakpoint
    await page.debugger.waitForCallStack();
    // Wait for the red debug indicator box to appear
    await firstCell.locator('.jp-DebuggerEditor-highlight').waitFor({
      state: 'visible',
      timeout: 1000
    });
    expect(
      await page.screenshot({
        clip: { y: 110, x: 300, width: 300, height: 80 }
      })
    ).toMatchSnapshot('debugger_stop_on_raised_exception.png');
    await page.click('jp-button[title^=Continue]'); // Pauses as the error is raised (try block)
    await page.debugger.waitForCallStack();
    await page.click('jp-button[title^=Continue]'); // Pauses as the error is raised (catch block)
    await page.debugger.waitForCallStack();
    await page.click('jp-button[title^=Continue]'); // Pauses again as the error is unhandled
    await page.notebook.waitForRun(0);
  });

  test('Debugger sidebar', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    const sidebar = page.locator('[data-id="jp-debugger-sidebar"]');
    await sidebar.waitFor();
    await sidebar.click();
    await page.sidebar.setWidth(251, 'right');

    // Inject mouse pointer
    await page.evaluate(
      ([mouse]) => {
        document.body.insertAdjacentHTML('beforeend', mouse);
      },
      [await positionMouseOver(sidebar, { left: 0.25 })]
    );

    expect(
      await page.screenshot({
        clip: { y: 22, x: 1200, width: 85, height: 160 }
      })
    ).toMatchSnapshot('debugger_sidebar.png');
  });

  test('Variables panel', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());
    await page.sidebar.setWidth(251, 'right');

    await setBreakpoint(page);

    // Don't wait as it will be blocked
    void page.notebook.runCell(1);

    // Wait to be stopped on the breakpoint and the local variables to be displayed
    await page.debugger.waitForCallStack();
    await expect(page.locator('select[aria-label="Scope"]')).toHaveValue(
      'Locals'
    );

    expect(
      await page.screenshot({
        clip: { y: 58, x: 998, width: 280, height: 138 }
      })
    ).toMatchSnapshot('debugger_variables.png');
  });

  test('Call Stack panel', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());
    await page.sidebar.setWidth(251, 'right');

    await setBreakpoint(page);

    // Don't wait as it will be blocked
    void page.notebook.runCell(1);

    // Wait to be stopped on the breakpoint
    await page.debugger.waitForCallStack();

    await expect(
      page.locator('[aria-label="side panel content"] >> text=add').first()
    ).toBeVisible();

    // Don't compare screenshot as the kernel id varies
    // Need to set precisely the path
    await page.screenshot({
      clip: { y: 196, x: 998, width: 280, height: 138 },
      path: 'test/documentation/screenshots/debugger-callstack.png'
    });

    await page.click('jp-button[title^=Continue]');
  });

  test('Breakpoints panel', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());
    await page.sidebar.setWidth(251, 'right');

    await setBreakpoint(page);

    // Don't wait as it will be blocked
    void page.notebook.runCell(1);

    // Wait to be stopped on the breakpoint
    await page.debugger.waitForCallStack();

    const breakpointsPanel = await page.debugger.getBreakPointsPanelLocator();
    expect(await breakpointsPanel.innerText()).toMatch(/Cell \[\d+\]/);

    // Don't compare screenshot as the kernel id varies
    // Need to set precisely the path
    await page.screenshot({
      clip: { y: 334, x: 998, width: 280, height: 138 },
      path: 'test/documentation/screenshots/debugger-breakpoints.png'
    });

    await page.click('jp-button[title^=Continue]');
  });

  test('Source panel', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());
    await page.sidebar.setWidth(251, 'right');

    await setBreakpoint(page);

    // Don't wait as it will be blocked
    void page.notebook.runCell(1);

    // Wait to be stopped on the breakpoint
    await page.debugger.waitForCallStack();
    await expect(page.locator('.jp-DebuggerSources-header-path')).toContainText(
      'Cell ['
    );

    // Don't compare screenshot as the kernel id varies
    // Need to set precisely the path
    await page.screenshot({
      clip: { y: 478, x: 998, width: 280, height: 138 },
      path: 'test/documentation/screenshots/debugger-source.png'
    });

    await page.click('jp-button[title^=Continue]');
  });
});

async function createNotebook(page: IJupyterLabPageFixture) {
  await page.notebook.createNew();

  await page.sidebar.setWidth();

  await page.locator('text=Python 3 (ipykernel) | Idle').waitFor();
}

async function setBreakpoint(page: IJupyterLabPageFixture) {
  await page.notebook.setCell(
    0,
    'code',
    'def add(a, b):\nres = a + b\nreturn res'
  );
  await page.notebook.run();
  await page.notebook.addCell('code', 'result = add(1, 2)\nprint(result)');

  await page.notebook.clickCellGutter(0, 2);
}
