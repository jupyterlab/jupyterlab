// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { galata, IJupyterLabPageFixture, test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import {
  generateCaptureArea,
  positionMouse,
  setLeftSidebarWidth
} from './utils';

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  viewport: { height: 720, width: 1280 }
});

test.describe('Debugger', () => {
  test('Kernel capability', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    // Inject capture zone
    await page.evaluate(
      ([zone]) => {
        document.body.insertAdjacentHTML('beforeend', zone);
      },
      [generateCaptureArea({ top: 62, left: 1050, width: 190, height: 28 })]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('debugger_kernel.png');
  });

  test('Activate', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());

    // Inject capture zone
    await page.evaluate(
      ([zone]) => {
        document.body.insertAdjacentHTML('beforeend', zone);
      },
      [generateCaptureArea({ top: 62, left: 800, width: 190, height: 28 })]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('debugger_activate.png');
  });

  test('Set breakpoint', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());

    await setBreakpoint(page);

    // Inject capture zone
    await page.evaluate(
      ([zone]) => {
        document.body.insertAdjacentHTML('beforeend', zone);
      },
      [generateCaptureArea({ top: 100, left: 300, width: 300, height: 80 })]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('debugger_breakpoint.png');
  });

  test('Highlight run cell button', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    // Inject capture zone
    await page.evaluate(
      ([mouse, zone]) => {
        document.body.insertAdjacentHTML('beforeend', mouse + zone);
      },
      [
        positionMouse({ x: 446, y: 80 }),
        generateCaptureArea({ top: 62, left: 400, width: 190, height: 80 })
      ]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('debugger_run.png');
  });

  test('Stop on breakpoint', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());

    await setBreakpoint(page);

    // Don't wait as it will be blocked
    page.notebook.runCell(1);

    // Wait to be stopped on the breakpoint
    await page.debugger.waitForCallStack();

    // Inject capture zone
    await page.evaluate(
      ([zone]) => {
        document.body.insertAdjacentHTML('beforeend', zone);
      },
      [generateCaptureArea({ top: 100, left: 300, width: 300, height: 80 })]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('debugger_stop_on_breakpoint.png');

    await page.click('button[title^=Continue]');
  });

  test('Debugger sidebar', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.click('[data-id="jp-debugger-sidebar"]');

    // Inject capture zone
    await page.evaluate(
      ([mouse, zone]) => {
        document.body.insertAdjacentHTML('beforeend', mouse + zone);
      },
      [
        positionMouse({ x: 1240, y: 115 }),
        generateCaptureArea({ top: 22, left: 1200, width: 85, height: 160 })
      ]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('debugger_sidebar.png');
  });

  test('Variables panel', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());

    await setBreakpoint(page);

    // Don't wait as it will be blocked
    page.notebook.runCell(1);

    // Wait to be stopped on the breakpoint
    await page.debugger.waitForCallStack();

    // Inject capture zone
    await page.evaluate(
      ([zone]) => {
        document.body.insertAdjacentHTML('beforeend', zone);
      },
      [generateCaptureArea({ top: 58, left: 998, width: 280, height: 138 })]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('debugger_variables.png');

    await page.click('button[title^=Continue]');
  });

  test('Call Stack panel', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());

    await setBreakpoint(page);

    // Don't wait as it will be blocked
    page.notebook.runCell(1);

    // Wait to be stopped on the breakpoint
    await page.debugger.waitForCallStack();

    await page.pause();

    // Inject capture zone
    await page.evaluate(
      ([zone]) => {
        document.body.insertAdjacentHTML('beforeend', zone);
      },
      [generateCaptureArea({ top: 196, left: 998, width: 280, height: 138 })]
    );

    await expect(
      page.locator('[aria-label="side panel content"] >> text=add').first()
    ).toBeVisible();

    // Don't compare screenshot as the kernel id varies
    // Need to set precisely the path
    await (await page.$('#capture-screenshot')).screenshot({
      path: 'test/documentation/screenshots/debugger-callstack.png'
    });

    await page.click('button[title^=Continue]');
  });

  test('Breakpoints panel', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());

    await setBreakpoint(page);

    // Don't wait as it will be blocked
    page.notebook.runCell(1);

    // Wait to be stopped on the breakpoint
    await page.debugger.waitForCallStack();

    // Inject capture zone
    await page.evaluate(
      ([zone]) => {
        document.body.insertAdjacentHTML('beforeend', zone);
      },
      [generateCaptureArea({ top: 334, left: 998, width: 280, height: 138 })]
    );

    const breakpointsPanel = await page.debugger.getBreakPointsPanel();
    expect(await breakpointsPanel.innerText()).toMatch(
      /ipykernel.*\/2114632017.py/
    );

    // Don't compare screenshot as the kernel id varies
    // Need to set precisely the path
    await (await page.$('#capture-screenshot')).screenshot({
      path: 'test/documentation/screenshots/debugger-breakpoints.png'
    });

    await page.click('button[title^=Continue]');
  });

  test('Source panel', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());

    await setBreakpoint(page);

    // Don't wait as it will be blocked
    page.notebook.runCell(1);

    // Wait to be stopped on the breakpoint
    await page.debugger.waitForCallStack();

    // Inject capture zone
    await page.evaluate(
      ([zone]) => {
        document.body.insertAdjacentHTML('beforeend', zone);
      },
      [generateCaptureArea({ top: 478, left: 998, width: 280, height: 138 })]
    );

    await expect(
      page.locator(
        '[aria-label="side panel content"] >> text=Source/tmp/ipykernel_'
      )
    ).toBeVisible();

    // Don't compare screenshot as the kernel id varies
    // Need to set precisely the path
    await (await page.$('#capture-screenshot')).screenshot({
      path: 'test/documentation/screenshots/debugger-source.png'
    });

    await page.click('button[title^=Continue]');
  });
});

async function createNotebook(page: IJupyterLabPageFixture) {
  await page.notebook.createNew();

  await setLeftSidebarWidth(page);

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
