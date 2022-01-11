// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import { generateArrow, positionMouse } from './utils';

test.use({ autoGoto: false, viewport: { height: 720, width: 1280 } });

test.describe('Documentation screenshots', () => {
  test('Welcome', async ({ page }) => {
    await page.goto();

    // README.md in preview
    await page.click('text=README.md', {
      button: 'right'
    });
    await page.click('text=Open With');
    await page.click('text=Markdown Preview');

    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );
    await page.dblclick('text=Lorenz.ipynb');

    // Click text=File
    await page.click('text=File');
    await page.click('ul[role="menu"] >> text=New');
    // Click #jp-mainmenu-file-new >> text=Terminal
    await page.click('#jp-mainmenu-file-new >> text=Terminal');
    // Click text=File
    await page.click('text=File');
    await page.click('ul[role="menu"] >> text=New');
    // Click #jp-mainmenu-file-new >> text=Console
    await page.click('#jp-mainmenu-file-new >> text=Console');
    await page.click('button:has-text("Select")');

    // Click text=Data.ipynb
    await page.dblclick('text=Data.ipynb');

    await page.dblclick('text=lorenz.py');

    // Click div[role="main"] >> text=Lorenz.ipynb
    await page.click('div[role="main"] >> text=Lorenz.ipynb');

    await page.notebook.run();
    // // Click text=Run
    // await page.click('text=Run');
    // // Click ul[role="menu"] >> text=Run All Cells
    // await page.click('ul[role="menu"] >> text=Run All Cells');

    // await page.waitForTimeout(500);
    // const cell = await page.notebook.getCell(5);
    const cell = await page.$(
      '[aria-label="Code Cell Content with Output"] >> text=interactive'
    );
    await cell.click();
    await page.keyboard.press('ContextMenu');
    // Click text=Create New View for Output
    await page.click('text=Create New View for Output');

    // Emulate drag and drop
    const viewerHandle = await page.$('div[role="main"] >> text=lorenz.py');
    await viewerHandle.click();
    const viewerBBox = await viewerHandle.boundingBox();

    await page.mouse.move(
      viewerBBox.x + 0.5 * viewerBBox.width,
      viewerBBox.y + 0.5 * viewerBBox.height
    );
    await page.mouse.down();
    await page.mouse.move(viewerBBox.x + 0.5 * viewerBBox.width, 600);
    await page.mouse.up();

    expect(await page.screenshot()).toMatchSnapshot('jupyterlab.png');
  });

  test('Overview', async ({ page }) => {
    await openOverview(page);

    expect(await page.screenshot()).toMatchSnapshot('interface_jupyterlab.png');
  });

  test('Left Sidebar', async ({ page }) => {
    await page.goto();
    await page.dblclick('[aria-label="File Browser Section"] >> text=data');

    // Inject capture zone
    await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="capture-screenshot" style="position: absolute; top: 31px; left: 0px; width: 283px; height: 400px;"></div>'
      );
    });

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('interface_left.png');
  });

  test('Open tabs', async ({ page }) => {
    await openOverview(page);

    await page.click('[title="Running Terminals and Kernels"]');

    // Inject capture zone
    await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="capture-screenshot" style="position: absolute; top: 31px; left: 0px; width: 283px; height: 400px;"></div>'
      );
    });

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('interface_tabs.png');
  });

  test('Tabs menu', async ({ page }) => {
    await openOverview(page);

    await page.click('text="Tabs"');

    // Inject capture zone
    await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="capture-screenshot" style="position: absolute; top: 5px; left: 210px; width: 700px; height: 350px;"></div>'
      );
    });

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('interface_tabs_menu.png');
  });

  test('File menu', async ({ page }) => {
    await page.goto();

    // Hide file browser
    await page.click('[title^="File Browser"]');

    // Inject arrow and capture zone
    await page.evaluate(
      ([arrow]) => {
        document.body.insertAdjacentHTML('beforeend', arrow);
        document.body.insertAdjacentHTML(
          'beforeend',
          '<div id="capture-screenshot" style="position: absolute; top: 31px; left: 0px; width: 283px; height: 400px;"></div>'
        );
      },
      [generateArrow({ x: 50, y: 55 }, -30)]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('file_menu_left.png');
  });

  test('File New menu', async ({ page }) => {
    await page.goto();

    // Hide file browser
    await page.click('[title^="File Browser"]');

    await page.click('text=File');
    await page.mouse.move(70, 40);
    await page.click('ul[role="menu"] >> text=New');

    // Inject mouse and capture zone
    await page.evaluate(
      ([mouse]) => {
        document.body.insertAdjacentHTML('beforeend', mouse);
        document.body.insertAdjacentHTML(
          'beforeend',
          '<div id="capture-screenshot" style="position: absolute; top: 5px; left: 0px; width: 620px; height: 400px;"></div>'
        );
      },
      [positionMouse({ x: 35, y: 35 })]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('file_menu_top.png');
  });

  test('Shareable link', async ({ page }) => {
    await page.goto();

    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );

    await page.click('text=Lorenz.ipynb', { button: 'right' });
    await page.hover('text=Copy Shareable Link');

    // Inject mouse and capture zone
    await page.evaluate(
      ([mouse]) => {
        document.body.insertAdjacentHTML('beforeend', mouse);
        document.body.insertAdjacentHTML(
          'beforeend',
          '<div id="capture-screenshot" style="position: absolute; top: 5px; left: 0px; width: 500px; height: 500px;"></div>'
        );
      },
      [positionMouse({ x: 260, y: 350 })]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('shareable_link.png');
  });

  test('File New Text file', async ({ page }) => {
    await page.goto();

    // Hide file browser
    await page.click('[title^="File Browser"]');

    await page.click('text=File');
    await page.mouse.move(70, 40);
    await page.click('ul[role="menu"] >> text=New');
    await page.hover('ul[role="menu"] >> text=Text File');

    // Inject mouse and capture zone
    await page.evaluate(
      ([mouse]) => {
        document.body.insertAdjacentHTML('beforeend', mouse);
        document.body.insertAdjacentHTML(
          'beforeend',
          '<div id="capture-screenshot" style="position: absolute; top: 5px; left: 0px; width: 620px; height: 400px;"></div>'
        );
      },
      [positionMouse({ x: 500, y: 110 })]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('file_create_text_file.png');
  });

  test('Text Editor Overview', async ({ page }) => {
    await page.goto();

    // Open jupyterlab.md
    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=narrative'
    );
    await page.dblclick('text=jupyterlab.md');

    // Hide file browser
    await page.click('[title^="File Browser"]');

    expect(await page.screenshot()).toMatchSnapshot('file_editor_overview.png');
  });

  test('Text Editor Settings', async ({ page }) => {
    await page.goto();

    // Open jupyterlab.md
    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=narrative'
    );
    await page.dblclick('text=jupyterlab.md');

    await page.click('text=Settings');
    await page.click('ul[role="menu"] >> text=Text Editor Key Map');

    // Inject capture zone
    await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="capture-screenshot" style="position: absolute; top: 5px; left: 260px; width: 600px; height: 450px;"></div>'
      );
    });

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('file_editor_settings.png');
  });

  // TODO continue at user/notebooks
});

async function openOverview(page) {
  await page.goto();

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
  const notebookHandle = await page.$('div[role="main"] >> text=Data.ipynb');
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
  const mdHandle = await page.$('div[role="main"] >> text=jupyterlab.md');
  await mdHandle.click();
  const mdBBox = await mdHandle.boundingBox();
  const panelHandle = await page.activity.getPanel();
  const panelBBox = await panelHandle.boundingBox();

  await page.mouse.move(
    mdBBox.x + 0.5 * mdBBox.width,
    mdBBox.y + 0.5 * mdBBox.height
  );
  await page.mouse.down();
  await page.mouse.move(panelBBox.x + 0.75 * panelBBox.width, 200);
  await page.mouse.up();
}
