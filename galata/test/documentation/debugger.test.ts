// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IJupyterLabPageFixture, test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import { positionMouse } from './utils';

test.use({ autoGoto: false, viewport: { height: 720, width: 1280 } });

test.describe('Debugger', () => {
  test('Kernel capability', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    // Inject capture zone
    await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="capture-screenshot" style="position: absolute; top: 62px; left: 1050px; width: 190px; height: 28px;"></div>'
      );
    });

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
    await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="capture-screenshot" style="position: absolute; top: 62px; left: 800px; width: 190px; height: 28px;"></div>'
      );
    });

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
    await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="capture-screenshot" style="position: absolute; top: 100px; left: 300px; width: 300px; height: 80px;"></div>'
      );
    });

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('debugger_breakpoint.png');
  });

  test('Highlight run cell button', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await createNotebook(page);

    // Inject capture zone
    await page.evaluate(
      ([mouse]) => {
        document.body.insertAdjacentHTML('beforeend', mouse);
        document.body.insertAdjacentHTML(
          'beforeend',
          '<div id="capture-screenshot" style="position: absolute; top: 62px; left: 400px; width: 190px; height: 80px;"></div>'
        );
      },
      [positionMouse({ x: 446, y: 80 })]
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
    await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="capture-screenshot" style="position: absolute; top: 100px; left: 300px; width: 300px; height: 80px;"></div>'
      );
    });

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
      ([mouse]) => {
        document.body.insertAdjacentHTML('beforeend', mouse);
        document.body.insertAdjacentHTML(
          'beforeend',
          '<div id="capture-screenshot" style="position: absolute; top: 22px; left: 1200px; width: 85px; height: 160px;"></div>'
        );
      },
      [positionMouse({ x: 1240, y: 115 })]
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
    await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="capture-screenshot" style="position: absolute; top: 58px; left: 998px; width: 280px; height: 138px;"></div>'
      );
    });

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
    await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="capture-screenshot" style="position: absolute; top: 196px; left: 998px; width: 280px; height: 138px;"></div>'
      );
    });

    await expect(
      page.locator('[aria-label="side panel content"] >> text=add').first()
    ).toBeVisible();

    // Don't compare screenshot as the kernel id varies
    // Need to set precisely the path
    await (await page.$('#capture-screenshot')).screenshot({
      path: 'test/documentation/screenshots/debugger-callstack.png'
    });

    // Remove capture area so clicking on the Continue button is possible
    await page.evaluate(() => {
      document.body.querySelector('#capture-screenshot').remove();
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
    await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="capture-screenshot" style="position: absolute; top: 334px; left: 998px; width: 280px; height: 138px;"></div>'
      );
    });

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
    await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="capture-screenshot" style="position: absolute; top: 478px; left: 998px; width: 280px; height: 138px;"></div>'
      );
    });

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
