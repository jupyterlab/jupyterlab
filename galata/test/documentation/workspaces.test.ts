// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { expect, galata, test } from '@jupyterlab/galata';
import * as path from 'path';

import { positionMouseOver } from './utils';

test.use({
  viewport: { height: 720, width: 1280 },
  mockState: false
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
    await page
      .locator(
        `.jp-RunningSessions-item.jp-mod-workspace >> text=${workspaceName}`
      )
      .waitFor();

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

    const workspaceItem = page.locator(
      '.jp-RunningSessions-item.jp-mod-workspace >> text=default'
    );
    // Open menu for the shot
    await workspaceItem.click({ button: 'right' });
    const renameWorkspace = page.locator(
      '.lm-Menu-itemLabel:text("Rename Workspace")'
    );
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

    expect(
      await page.screenshot({ clip: { y: 0, x: 0, width: 400, height: 420 } })
    ).toMatchSnapshot('workspaces_sidebar.png');
  });
});
