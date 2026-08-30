// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IJupyterLabPageFixture } from '@jupyterlab/galata';
import { expect, galata, test } from '@jupyterlab/galata';
import path from 'path';
import { positionMouseOver } from './utils';

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  viewport: { height: 720, width: 1280 }
});

// Rendering a variable requires a round trip to the kernel, which can be slow
// when several tests are running in parallel.
const RENDER_TIMEOUT = 15000;

// Default sizes of the Lumino data grid the variables table is built on, and
// the position of the `values` variable in it.
const COLUMN_HEADER_HEIGHT = 20;
const ROW_HEIGHT = 20;
const VALUES_ROW = 2;

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

    const breakpointIcon = page
      .locator('.jp-NotebookPanel-notebook')
      .first()
      .locator('.jp-Cell[data-windowed-list-index="0"]')
      .locator('.cm-gutter.cm-breakpoint-gutter .cm-gutterElement')
      .nth(2)
      .locator('span.cm-breakpoint-icon');

    // Wait for breakpoint to finish appearing
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
    await page.notebook.runCell(1, { wait: false });

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

    await page.notebook.runCell(0, { wait: false });

    // Wait to be stopped on the breakpoint
    await page.debugger.waitForCallStack();
    // Wait for the red debug indicator box to appear
    const firstCell = (await page.notebook.getCellLocator(0))!;
    await firstCell.locator('.jp-DebuggerEditor-highlight').waitFor({
      state: 'visible',
      timeout: 1000
    });
    expect
      .soft(
        await page.screenshot({
          clip: { y: 110, x: 300, width: 300, height: 80 }
        })
      )
      .toMatchSnapshot('debugger_stop_on_unhandled_exception.png');

    await page.click('jp-button[title^=Continue]');
    await page.notebook.waitForRun(0);

    await page.locator('jp-button.jp-PauseOnExceptions').click();

    await expect(menu.locator('li.lm-Menu-item.lm-mod-toggled')).toHaveCount(1);
    await expect(
      menu.locator('li:has(div.lm-Menu-itemLabel:text("userUnhandled"))')
    ).toHaveClass(/lm-mod-toggled/);

    await menu.locator('li div.lm-Menu-itemLabel:text("raised")').click();

    await page.notebook.runCell(0, { wait: false });

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
    await page.sidebar.setWidth(275, 'right');

    await setBreakpoint(page);

    // Don't wait as it will be blocked
    await page.notebook.runCell(1, { wait: false });

    // Wait to be stopped on the breakpoint and the local variables to be displayed
    await page.debugger.waitForCallStack();
    await expect(page.locator('select[aria-label="Scope"]')).toHaveValue(
      'Locals'
    );

    const variablesLocator = await page.debugger.getVariablesPanelLocator();
    const bbox = (await variablesLocator.boundingBox())!;

    expect(
      await page.screenshot({
        clip: { ...bbox, y: bbox?.y - 35, height: bbox.height }
      })
    ).toMatchSnapshot('debugger_variables.png');
  });

  test.describe('Variable inspector', () => {
    test('Table view', async ({ page, tmpPath }) => {
      await page.goto(`tree/${tmpPath}`);

      await stopOnBreakpoint(page, tmpPath);
      await page.locator('jp-button[title="Table View"]').click();

      const variablesLocator = await page.debugger.getVariablesPanelLocator();
      const bbox = (await variablesLocator.boundingBox())!;

      expect(
        await page.screenshot({
          clip: { ...bbox, y: bbox.y - 35, height: bbox.height + 35 }
        })
      ).toMatchSnapshot('debugger_variables_table.png');

      await page.click('jp-button[title^=Continue]');
    });

    test('Inspect a variable', async ({ page, tmpPath }) => {
      await page.goto(`tree/${tmpPath}`);

      await stopOnBreakpoint(page, tmpPath);
      await page.locator('jp-button[title="Table View"]').click();

      // The table is painted on a canvas, hence the double click on a computed
      // position rather than on a locator.
      const grid = page.locator('.jp-DebuggerVariables-grid');
      const bbox = (await grid.boundingBox())!;
      await page.mouse.dblclick(
        bbox.x + bbox.width / 4,
        bbox.y + COLUMN_HEADER_HEIGHT + ROW_HEIGHT * (VALUES_ROW + 0.5)
      );

      const inspector = page.locator('#jp-debugger-variable-values');
      await inspector.waitFor();
      await expect(inspector.locator('canvas')).not.toHaveCount(0);
      // The table of the inspected variable is painted on the next frames.
      // eslint-disable-next-line playwright/no-wait-for-timeout
      await page.waitForTimeout(200);

      expect(
        await page.locator('#jp-main-dock-panel').screenshot()
      ).toMatchSnapshot('debugger_variable_inspector.png');

      await page.click('jp-button[title^=Continue]');
    });

    test('Render a variable', async ({ page, tmpPath }) => {
      await page.goto(`tree/${tmpPath}`);

      await stopOnBreakpoint(page, tmpPath);

      await page.debugger.renderVariable('logo');
      await page
        .locator('.jp-DebuggerRichVariable img')
        .waitFor({ timeout: RENDER_TIMEOUT });

      expect(
        await page.locator('#jp-main-dock-panel').screenshot()
      ).toMatchSnapshot('debugger_variable_renderer.png');

      await page.click('jp-button[title^=Continue]');
    });
  });

  test('Call Stack panel', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());
    await page.sidebar.setWidth(275, 'right');

    await setBreakpoint(page);

    // Don't wait as it will be blocked
    await page.notebook.runCell(1, { wait: false });

    // Wait to be stopped on the breakpoint
    await page.debugger.waitForCallStack();

    await expect(
      page.locator('[aria-label="side panel content"] >> text=add').first()
    ).toBeVisible();

    const callstackLocator = await page.debugger.getCallStackPanelLocator();
    const bbox = (await callstackLocator.boundingBox())!;

    expect(
      await page.screenshot({
        clip: { ...bbox, y: bbox?.y - 35, height: bbox.height + 35 }
      })
    ).toMatchSnapshot('debugger_callstack.png');

    await page.click('jp-button[title^=Continue]');
  });

  test('Breakpoints panel', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());
    await page.sidebar.setWidth(275, 'right');

    await setBreakpoint(page);

    // Don't wait as it will be blocked
    await page.notebook.runCell(1, { wait: false });

    // Wait to be stopped on the breakpoint
    await page.debugger.waitForCallStack();

    const breakpointsPanel = await page.debugger.getBreakPointsPanelLocator();
    expect(await breakpointsPanel.innerText()).toMatch(/Cell \[\d+\]/);

    const bbox = (await breakpointsPanel.boundingBox())!;

    expect(
      await page.screenshot({
        clip: { ...bbox, y: bbox?.y - 35, height: bbox.height + 35 }
      })
    ).toMatchSnapshot('debugger_breakpoints.png');

    await page.click('jp-button[title^=Continue]');
  });

  test.describe('Show sources', () => {
    test.describe('showSourcesInMainArea = false', () => {
      test.use({
        mockSettings: {
          ...galata.DEFAULT_SETTINGS,
          '@jupyterlab/debugger-extension:main': {
            showSourcesInMainArea: false
          }
        }
      });

      test('sources in sidebar', async ({ page, tmpPath }) => {
        await page.goto(`tree/${tmpPath}`);
        await createNotebook(page);

        await page.debugger.switchOn();
        await page.waitForCondition(() => page.debugger.isOpen());
        await page.sidebar.setWidth(275, 'right');

        await setBreakpoint(page);

        // Don't wait as it will be blocked
        await page.notebook.runCell(1, { wait: false });

        // Wait to be stopped on the breakpoint
        await page.debugger.waitForCallStack();

        await expect(
          page.locator('.jp-DebuggerSources-header-path')
        ).toContainText('Cell [');

        expect(
          await page.screenshot({
            clip: { y: 334, x: 974, width: 300, height: 360 }
          })
        ).toMatchSnapshot('debugger_with_source_panel.png');
        await page.click('jp-button[title^=Continue]');
        await expect(page.locator('.jp-DebuggerSources')).toBeVisible();
      });
    });

    test.describe('showSourcesInMainArea = true', () => {
      test.use({
        mockSettings: {
          ...galata.DEFAULT_SETTINGS,
          '@jupyterlab/debugger-extension:main': {
            showSourcesInMainArea: true
          }
        }
      });

      test('sources in main area', async ({ page, request, tmpPath }) => {
        await page.goto(`tree/${tmpPath}`);
        const localFile = path.resolve(__dirname, 'add.py');

        const contents = galata.newContentsHelper(request, page);
        await contents.uploadFile(localFile, `${tmpPath}/add.py`);

        await createNotebook(page);

        await page.debugger.switchOn();
        await page.waitForCondition(() => page.debugger.isOpen());

        await page.notebook.setCell(
          0,
          'code',
          'from add import add \nresult = add(1, 2)\nprint(result)'
        );

        await page.notebook.clickCellGutter(0, 2);

        // Don't wait as it will be blocked
        await page.notebook.runCell(0, { wait: false });

        // Wait to be stopped on the breakpoint
        await page.debugger.waitForCallStack();
        await page.click('jp-button[aria-label="Step In (F11)"]');
        await page.debugger.waitForCallStack();

        await expect(page.locator('.cm-editor.jp-mod-readOnly')).toBeVisible();

        expect(
          await page.locator('#jp-main-dock-panel').screenshot()
        ).toMatchSnapshot('debugger_open_module.png');

        await page.click('jp-button[title^=Continue]');
      });
    });
  });
});

async function createNotebook(page: IJupyterLabPageFixture) {
  await page.notebook.createNew();

  await page.sidebar.setWidth();

  await page.locator('text=Python 3 (ipykernel) | Idle').waitFor();
}

/**
 * Run a notebook defining variables of different kinds with the debugger
 * enabled, until it stops in the body of its function.
 */
async function stopOnBreakpoint(page: IJupyterLabPageFixture, tmpPath: string) {
  // The image is loaded from the working directory of the kernel.
  await page.contents.uploadFile(
    path.resolve(__dirname, './data/jupyter.png'),
    `${tmpPath}/jupyter.png`
  );

  await createNotebook(page);

  // Leave the notebook alone in the main area, as the screenshots taken of it
  // would otherwise show the launcher opened on start-up as a background tab.
  const launcher = page.activity.getTabLocator('Launcher');
  await launcher.locator('.lm-TabBar-tabCloseIcon').click();
  await launcher.waitFor({ state: 'detached' });

  await page.debugger.switchOn();
  await page.waitForCondition(() => page.debugger.isOpen());
  await page.sidebar.setWidth(275, 'right');

  await page.notebook.setCell(
    0,
    'code',
    'from IPython.display import Image\n' +
      'def summarize(values):\n' +
      'logo = Image("jupyter.png")\n' +
      'total = sum(values)\n' +
      'return total'
  );
  await page.notebook.run();
  await page.notebook.addCell(
    'code',
    'measurements = [3, 1, 4, 1, 5]\nsummarize(measurements)'
  );

  // Stop on the `return total` line.
  await page.notebook.clickCellGutter(0, 5);

  // Don't wait as it will be blocked
  await page.notebook.runCell(1, { wait: false });

  await page.debugger.waitForCallStack();
  await page.debugger.waitForVariables();
  await expect(page.locator('select[aria-label="Scope"]')).toHaveValue(
    'Locals'
  );
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
