// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { IJupyterLabPageFixture, test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';

const fileName = 'notebook.ipynb';

async function populateNotebook(page: IJupyterLabPageFixture) {
  await page.waitForCondition(async () => await page.notebook.isAnyActive());
  await page.notebook.setCell(
    0,
    'code',
    ['a = 1', 'b = 2', 'c = 3', 'print((a + b) == c)'].join('\n')
  );
}

test.describe('Debugger Tests', () => {
  test('Move Debugger to right', async ({ page }) => {
    await page.sidebar.moveTabToRight('jp-debugger-sidebar');
    expect(await page.sidebar.getTabPosition('jp-debugger-sidebar')).toBe(
      'right'
    );
  });

  test('Open Debugger on right', async ({ page }) => {
    await page.sidebar.openTab('jp-debugger-sidebar');
    expect(await page.sidebar.isTabOpen('jp-debugger-sidebar')).toBeTruthy();
  });

  test('Start debug session', async ({ page }) => {
    await page.waitForSelector(page.launcherSelector);
    await page.click('.jp-LauncherCard[title*=ipykernel]');
    await populateNotebook(page);
    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());

    await page.notebook.waitForCellGutter(0);
    await page.notebook.clickCellGutter(0, 2);

    await page.waitForTimeout(2000);
    const breakpointsPanel = await page.debugger.getBreakPointsPanel();
    expect(await breakpointsPanel.innerText()).toMatch(/ipykernel/);

    const callStackPanel = await page.debugger.getCallStackPanel();
    expect(await callStackPanel.innerText()).toBe('');

    // don't add await, run will be blocked by the breakpoint
    page.notebook.run();
    await page.waitForTimeout(2000);

    expect(await callStackPanel.innerText()).toMatch(/ipykernel/);

    const variablesPanel = await page.debugger.getVariablesPanel();
    expect(await variablesPanel.screenshot()).toMatchSnapshot(
      'start-debug-session-variables.png'
    );

    const sourcesPanel = await page.debugger.getSourcePanel();
    expect(await sourcesPanel.screenshot()).toMatchSnapshot(
      'start-debug-session-sources.png'
    );
  });
});
