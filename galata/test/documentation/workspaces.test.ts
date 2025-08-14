// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { expect, galata, test } from '@jupyterlab/galata';
import * as path from 'path';

import { positionMouseOver } from './utils';

test.use({
  autoGoto: false,
  viewport: { height: 720, width: 1280 },
  mockState: false,
  tmpPath: 'workspaces-sidebar'
});

test.describe('Workspaces sidebar', () => {
  const workspaceName = 'analysis-space';
  const testWorkspace = `${workspaceName}.jupyterlab-workspace`;

  test.beforeAll(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);

    await contents.uploadFile(
      path.resolve(__dirname, `./data/${testWorkspace}`),
      `${tmpPath}/${testWorkspace}`
    );
  });

  test.beforeEach(async ({ page, tmpPath }) => {
    await page.goto('?reset');
    await page.filebrowser.openDirectory(tmpPath);
  });

  test.afterAll(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.deleteDirectory(tmpPath);
  });

  test('Workspaces context menu', async ({ page }) => {
    // Load the test workspace
    await page.dblclick(
      `.jp-DirListing-item span:has-text("${testWorkspace}")`
    );
    await page.getByRole('treeitem', { name: workspaceName }).waitFor();

    await galata.Mock.mockRunners(page, new Map(), 'sessions');

    // Create additional workspaces for the shot
    await page.evaluate(async () => {
      for (const workspaceName of ['my-coding-space', 'default']) {
        await window.jupyterapp.commands.execute('workspace-ui:create-new', {
          workspace: workspaceName
        });
      }
    });

    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    const workspaceItem = page.getByRole('treeitem', { name: 'default' });
    // Open menu for the shot
    await workspaceItem.click({ button: 'right' });
    const renameWorkspace = page.getByRole('menuitem', {
      name: 'Rename Workspace'
    });
    await renameWorkspace.hover();
    // Inject mouse
    await page.evaluate(
      ([mouse]) => {
        document.body.insertAdjacentHTML('beforeend', mouse);
      },
      [
        await positionMouseOver(renameWorkspace, {
          left: 1,
          offsetLeft: 5,
          top: 0.25
        })
      ]
    );

    await page.launcher.waitFor();

    // Force the kernel sidebar to "empty" state to avoid flaky snapshots;
    // mocking the kernel session state does not help here, possibly due to
    // concurrent test execution, so we manipulate the DOM directly.
    const kernelsSection = page.locator('[aria-label="Kernels Section"]');
    for (const buttonName of ['collapse-expand', 'switch-view']) {
      const button = kernelsSection.locator(
        `.jp-ToolbarButton[data-jp-item-name="${buttonName}"]`
      );
      if (await button.isVisible()) {
        await button.evaluate(node => (node.style.display = 'none'));
      }
    }
    const button = kernelsSection.locator('.jp-RunningSessions-shutdownAll');
    await button.evaluate(
      node => ((node as HTMLButtonElement).disabled = true)
    );

    expect(
      await page.screenshot({ clip: { y: 0, x: 0, width: 400, height: 420 } })
    ).toMatchSnapshot('workspaces_sidebar.png');
  });
});
