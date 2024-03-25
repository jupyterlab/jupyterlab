// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect,
  galata,
  IJupyterLabPageFixture,
  test
} from '@jupyterlab/galata';
import { filterContent } from './utils';

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  viewport: { height: 720, width: 1280 }
});

// Use serial mode to avoid flaky screenshots
test.describe.configure({ mode: 'serial' });

test.describe('Overview', () => {
  test('Overview', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page, filterContent);
    await openOverview(page);

    expect(await page.screenshot()).toMatchSnapshot('interface_jupyterlab.png');
  });

  test('Open tabs', async ({ page }) => {
    await openOverview(page);

    await page.click('[title="Running Terminals and Kernels"]');

    // Close all other sections
    const otherSession = page.locator(
      '#jp-running-sessions .jp-AccordionPanel-title.lm-mod-expanded:not([aria-label="Open Tabs Section"]) .lm-AccordionPanel-titleCollapser'
    );
    while ((await otherSession.count()) != 0) {
      await otherSession.first().click();
    }

    expect(
      await page.screenshot({ clip: { y: 27, x: 0, width: 283, height: 200 } })
    ).toMatchSnapshot('interface_tabs.png');
  });

  test('Tabs menu', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page, filterContent);
    await openOverview(page);

    await page.click('text="Tabs"');

    expect(
      await page.screenshot({ clip: { y: 0, x: 210, width: 700, height: 350 } })
    ).toMatchSnapshot('interface_tabs_menu.png');
  });
});

async function openOverview(page: IJupyterLabPageFixture) {
  await page.goto();
  await page.addStyleTag({
    content: `.jp-LabShell.jp-mod-devMode {
      border-top: none;
    }`
  });

  await page.sidebar.setWidth();

  // Open Data.ipynb
  await page.dblclick('[aria-label="File Browser Section"] >> text=notebooks');
  await page.dblclick('text=Data.ipynb');

  // Back home
  await page.click('.jp-BreadCrumbs-home svg');

  // Open jupyterlab.md
  await page.dblclick('[aria-label="File Browser Section"] >> text=narrative');
  await page.click('text=jupyterlab.md', {
    button: 'right'
  });
  await page.click('text=Open With');
  await page.click('text=Markdown Preview');

  // Back home
  await page.click('.jp-BreadCrumbs-home svg');

  // Open bar.vl.json
  await page.dblclick('[aria-label="File Browser Section"] >> text=data');
  await page.dblclick('text=bar.vl.json');
  await page.dblclick(
    'text=1024px-Hubble_Interacting_Galaxy_AM_0500-620_(2008-04-24).jpg'
  );

  // Move notebook panel
  const notebookHandle = page.locator('div[role="main"] >> text=Data.ipynb');
  await notebookHandle.click();
  const notebookBBox = await notebookHandle.boundingBox();

  await page.mouse.move(
    notebookBBox.x + 0.5 * notebookBBox.width,
    notebookBBox.y + 0.5 * notebookBBox.height
  );
  await page.mouse.down();
  await page.mouse.move(notebookBBox.x + 0.5 * notebookBBox.width, 350);
  await page.mouse.up();

  // Move md panel
  const mdHandle = page.locator('div[role="main"] >> text=jupyterlab.md');
  await mdHandle.click();
  const mdBBox = await mdHandle.boundingBox();
  const panelHandle = await page.activity.getPanelLocator();
  const panelBBox = await panelHandle.boundingBox();

  await page.mouse.move(
    mdBBox.x + 0.5 * mdBBox.width,
    mdBBox.y + 0.5 * mdBBox.height
  );
  await page.mouse.down();
  await page.mouse.move(panelBBox.x + 0.5 * panelBBox.width, 200);
  await page.mouse.up();
}
