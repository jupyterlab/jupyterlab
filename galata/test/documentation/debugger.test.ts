// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect,
  galata,
  IJupyterLabPageFixture,
  test
} from '@jupyterlab/galata';
import { positionMouseOver, setSidebarWidth } from './utils';

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
    await page.waitForSelector('#jp-main-statusbar >> text=Idle');
    await page.waitForSelector('#jp-main-statusbar >> text=Busy');
    await page.waitForSelector('#jp-main-statusbar >> text=Idle');

    expect(
      await page.screenshot({
        clip: { x: 1050, y: 62, width: 190, height: 28 }
      })
    ).toMatchSnapshot('debugger_kernel.png');
  });

  test('Activate', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());
    await setSidebarWidth(page, 251, 'right');

    expect(
      await page.screenshot({ clip: { y: 62, x: 800, width: 190, height: 28 } })
    ).toMatchSnapshot('debugger_activate.png');
  });

  test('Set breakpoint', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());
    await setSidebarWidth(page, 251, 'right');

    await setBreakpoint(page);

    // Wait for breakpoint to finish appearing
    await page.waitForTimeout(150);

    expect(
      await page.screenshot({
        clip: { y: 100, x: 300, width: 300, height: 80 }
      })
    ).toMatchSnapshot('debugger_breakpoint.png');
  });

  test('Highlight run cell button', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    const runButton = await page.waitForSelector(
      '.jp-Toolbar-item >> [data-command="runmenu:run"]'
    );
    await runButton.hover();

    // Inject mouse pointer
    await page.evaluate(
      ([mouse]) => {
        document.body.insertAdjacentHTML('beforeend', mouse);
      },
      [await positionMouseOver(runButton)]
    );

    expect(
      await page.screenshot({ clip: { y: 62, x: 400, width: 190, height: 60 } })
    ).toMatchSnapshot('debugger_run.png');
  });

  test('Stop on breakpoint', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());
    await setSidebarWidth(page, 251, 'right');

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

    await page.click('button[title^=Continue]');
  });

  test('Debugger sidebar', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    const sidebar = await page.waitForSelector(
      '[data-id="jp-debugger-sidebar"]'
    );
    await sidebar.click();
    await setSidebarWidth(page, 251, 'right');

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
    await setSidebarWidth(page, 251, 'right');

    await setBreakpoint(page);

    // Don't wait as it will be blocked
    void page.notebook.runCell(1);

    // Wait to be stopped on the breakpoint
    await page.debugger.waitForCallStack();

    expect(
      await page.screenshot({
        clip: { y: 58, x: 998, width: 280, height: 138 }
      })
    ).toMatchSnapshot('debugger_variables.png');

    await page.click('button[title^=Continue]');
  });

  test('Call Stack panel', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());
    await setSidebarWidth(page, 251, 'right');

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

    await page.click('button[title^=Continue]');
  });

  test('Breakpoints panel', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());
    await setSidebarWidth(page, 251, 'right');

    await setBreakpoint(page);

    // Don't wait as it will be blocked
    void page.notebook.runCell(1);

    // Wait to be stopped on the breakpoint
    await page.debugger.waitForCallStack();

    const breakpointsPanel = await page.debugger.getBreakPointsPanel();
    expect(await breakpointsPanel.innerText()).toMatch(
      /ipykernel.*\/2114632017.py/
    );

    // Don't compare screenshot as the kernel id varies
    // Need to set precisely the path
    await page.screenshot({
      clip: { y: 334, x: 998, width: 280, height: 138 },
      path: 'test/documentation/screenshots/debugger-breakpoints.png'
    });

    await page.click('button[title^=Continue]');
  });

  test('Source panel', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());
    await setSidebarWidth(page, 251, 'right');

    await setBreakpoint(page);

    // Don't wait as it will be blocked
    void page.notebook.runCell(1);

    // Wait to be stopped on the breakpoint
    await page.debugger.waitForCallStack();

    await expect(
      page.locator(
        '[aria-label="side panel content"] >> text=Source/tmp/ipykernel_'
      )
    ).toBeVisible();

    // Don't compare screenshot as the kernel id varies
    // Need to set precisely the path
    await page.screenshot({
      clip: { y: 478, x: 998, width: 280, height: 138 },
      path: 'test/documentation/screenshots/debugger-source.png'
    });

    await page.click('button[title^=Continue]');
  });
});

async function createNotebook(page: IJupyterLabPageFixture) {
  await page.notebook.createNew();

  await setSidebarWidth(page);

  await page.waitForSelector('text=Python 3 (ipykernel) | Idle');
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
