// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { IJupyterLabPageFixture, test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import * as path from 'path';

async function openNotebook(page: IJupyterLabPageFixture, tmpPath) {
  const fileName = 'code_notebook.ipynb';
  await page.contents.uploadFile(
    path.resolve(__dirname, `./notebooks/${fileName}`),
    `${tmpPath}/${fileName}`
  );
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);
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

  test('Start debug session', async ({ page, tmpPath }) => {
    await openNotebook(page, tmpPath);
    await page.debugger.switchOn();
    await page.waitForCondition(() => page.debugger.isOpen());

    await page.notebook.waitForCellGutter(0);
    await page.notebook.clickCellGutter(0, 2);

    await page.debugger.waitForBreakPoints();
    const breakpointsPanel = await page.debugger.getBreakPointsPanel();
    expect(await breakpointsPanel.innerText()).toMatch(/ipykernel/);

    const callStackPanel = await page.debugger.getCallStackPanel();
    expect(await callStackPanel.innerText()).toBe('');

    // don't add await, run will be blocked by the breakpoint
    page.notebook.run().then();

    await page.debugger.waitForCallStack();
    expect(await callStackPanel.innerText()).toMatch(/ipykernel/);

    await page.debugger.waitForVariables();
    const variablesPanel = await page.debugger.getVariablesPanel();
    expect(await variablesPanel.screenshot()).toMatchSnapshot(
      'start-debug-session-variables.png'
    );

    await page.debugger.waitForSources();
    const sourcesPanel = await page.debugger.getSourcePanel();
    expect(await sourcesPanel.screenshot()).toMatchSnapshot(
      'start-debug-session-sources.png'
    );
  });
});
