// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import {
  generateArrow,
  positionMouse,
  positionMouseOver,
  setSidebarWidth
} from './utils';

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  viewport: { height: 720, width: 1280 }
});

test.describe('General', () => {
  // FIXME restore when ipywidgets support lumino 2
  test.skip('Welcome', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page);
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await setSidebarWidth(page);

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

    await page.click('text=File');
    await page.click('.lm-Menu ul[role="menu"] >> text=New');
    await page.click('#jp-mainmenu-file-new >> text=Terminal');

    await page.click('text=File');
    await page.click('.lm-Menu ul[role="menu"] >> text=New');
    await page.click('#jp-mainmenu-file-new >> text=Console');
    await page.click('button:has-text("Select")');

    await page.dblclick('text=Data.ipynb');

    await page.dblclick('text=lorenz.py');

    await page.click('div[role="main"] >> text=Lorenz.ipynb');

    await page.notebook.run();

    const cell = await page.$(
      '[aria-label="Code Cell Content with Output"] >> text=interactive'
    );
    await cell.click();
    await page.keyboard.press('ContextMenu');
    await page.click('text=Create New View for Cell Output');

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
    await galata.Mock.freezeContentLastModified(page);
    await openOverview(page);

    expect(await page.screenshot()).toMatchSnapshot('interface_jupyterlab.png');
  });

  test('Left Sidebar', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page);
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await setSidebarWidth(page);

    await page.dblclick('[aria-label="File Browser Section"] >> text=data');

    await page.evaluate(() => {
      (document.activeElement as HTMLElement).blur();
    });

    expect(
      await page.screenshot({ clip: { y: 31, x: 0, width: 283, height: 400 } })
    ).toMatchSnapshot('interface_left.png');
  });

  test('Right Sidebar', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await page.notebook.createNew();
    await page.click('[title="Property Inspector"]');
    await setSidebarWidth(page, 251, 'right');

    expect(
      await page.screenshot({
        clip: { y: 32, x: 997, width: 283, height: 400 }
      })
    ).toMatchSnapshot('interface_right.png');

    await page.click('.jp-PropertyInspector >> text=Common Tools');

    expect(
      await page.screenshot({
        clip: { y: 32, x: 997, width: 283, height: 400 }
      })
    ).toMatchSnapshot('interface_right_common.png');
  });

  test('Open tabs', async ({ page }) => {
    await openOverview(page);

    await page.click('[title="Running Terminals and Kernels"]');

    await page
      .locator(
        '.jp-RunningSessions-item.jp-mod-kernel >> text="Python 3 (ipykernel)"'
      )
      .waitFor();
    expect(
      await page.screenshot({ clip: { y: 27, x: 0, width: 283, height: 400 } })
    ).toMatchSnapshot('interface_tabs.png');
  });

  test('Tabs menu', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page);
    await openOverview(page);

    await page.click('text="Tabs"');

    expect(
      await page.screenshot({ clip: { y: 0, x: 210, width: 700, height: 350 } })
    ).toMatchSnapshot('interface_tabs_menu.png');
  });

  test('File menu', async ({ page }) => {
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    // Hide file browser
    await page.click('[title^="File Browser"]');

    // Inject arrow
    await page.evaluate(
      ([arrow]) => {
        document.body.insertAdjacentHTML('beforeend', arrow);
      },
      [generateArrow({ x: 50, y: 55 }, -30)]
    );

    expect(
      await page.screenshot({ clip: { y: 27, x: 0, width: 283, height: 400 } })
    ).toMatchSnapshot('files_menu_left.png');
  });

  test('File New menu', async ({ page }) => {
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    // Hide file browser
    await page.click('[title^="File Browser"]');

    await page.click('text=File');
    await page.mouse.move(70, 40);
    const fileMenuNewItem = await page.waitForSelector(
      '.lm-Menu ul[role="menu"] >> text=New'
    );
    await fileMenuNewItem.click();

    // Inject mouse
    await page.evaluate(
      ([mouse]) => {
        document.body.insertAdjacentHTML('beforeend', mouse);
      },
      [
        await positionMouseOver(fileMenuNewItem, {
          left: 0,
          // small negative offset to place the cursor before "New"
          offsetLeft: -17,
          top: 0.5
        })
      ]
    );

    expect(
      await page.screenshot({ clip: { y: 0, x: 0, width: 620, height: 400 } })
    ).toMatchSnapshot('files_menu_top.png');
  });

  test('Shareable link', async ({ page }) => {
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await setSidebarWidth(page);

    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );

    await page.click('text=Lorenz.ipynb', { button: 'right' });
    await page.hover('text=Copy Shareable Link');

    const itemHandle = await page.$('text=Copy Shareable Link');

    // Inject mouse
    await page.evaluate(
      ([mouse]) => {
        document.body.insertAdjacentHTML('beforeend', mouse);
      },
      [await positionMouseOver(itemHandle, { top: 0.5, left: 0.55 })]
    );

    expect(
      await page.screenshot({ clip: { y: 0, x: 0, width: 500, height: 500 } })
    ).toMatchSnapshot('files_shareable_link.png');
  });

  test('File New Text file', async ({ page }) => {
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    // Hide file browser
    await page.click('[title^="File Browser"]');

    await page.click('text=File');
    await page.mouse.move(70, 40);
    await page.click('.lm-Menu ul[role="menu"] >> text=New');
    await page.hover('.lm-Menu ul[role="menu"] >> text=Text File');

    // Inject mouse
    await page.evaluate(
      ([mouse]) => {
        document.body.insertAdjacentHTML('beforeend', mouse);
      },
      [positionMouse({ x: 500, y: 110 })]
    );

    expect(
      await page.screenshot({ clip: { y: 0, x: 0, width: 620, height: 400 } })
    ).toMatchSnapshot('files_create_text_file.png');
  });

  test('Text Editor Overview', async ({ page }) => {
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

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
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await setSidebarWidth(page);

    // Open jupyterlab.md
    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=narrative'
    );
    await page.dblclick('text=jupyterlab.md');

    await page.click('text=Settings');
    await page.click(
      '.lm-Menu ul[role="menu"] >> text=Text Editor Indentation'
    );

    expect(
      await page.screenshot({ clip: { y: 0, x: 260, width: 600, height: 450 } })
    ).toMatchSnapshot('file_editor_settings.png');
  });

  test('Notebook', async ({ page }, testInfo) => {
    await galata.Mock.freezeContentLastModified(page);
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await setSidebarWidth(page);

    // Open Data.ipynb
    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );
    await page.dblclick('text=Data.ipynb');

    await page.notebook.setCell(
      1,
      'code',
      "import pandas\ndf = pandas.read_csv('../data/iris.csv')\ndf.head(5)"
    );
    await page.notebook.setCell(
      3,
      'code',
      "import json\nfrom IPython.display import GeoJSON\nwith open('../data/Museums_in_DC.geojson') as f:\ns = GeoJSON(json.load(f), layer_options={'minZoom': 11})"
    );
    await page.notebook.run();

    if (testInfo.config.updateSnapshots !== 'none') {
      // Wait a bit for the map to load when updating the snapshots
      await page.waitForTimeout(300);
    }

    // Relax threshold as displayed map may change a bit (in particular text positioning)
    expect(await page.screenshot()).toMatchSnapshot('notebook_ui.png', {
      threshold: 0.3
    });
  });

  test('Heading anchor', async ({ page }, testInfo) => {
    await page.goto();
    await setSidebarWidth(page);

    // Open Data.ipynb
    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );
    await page.dblclick('text=Data.ipynb');

    const heading = await page.waitForSelector(
      'h2[id="Open-a-CSV-file-using-Pandas"]'
    );
    const anchor = await heading.$('text=¶');
    await heading.hover();

    // Get parent cell which includes the heading
    const cell = await heading.evaluateHandle(node => node.closest('.jp-Cell'));

    // Inject mouse
    await page.evaluate(
      ([mouse]) => {
        document.body.insertAdjacentHTML('beforeend', mouse);
      },
      [
        await positionMouseOver(anchor, {
          left: 1,
          offsetLeft: 5,
          top: 0.25
        })
      ]
    );

    expect(await cell.screenshot()).toMatchSnapshot(
      'notebook_heading_anchor_link.png'
    );
  });

  test('Terminals', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page);
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await setSidebarWidth(page);

    // Open Data.ipynb
    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );
    await page.dblclick('text=Data.ipynb');

    // Open a terminal
    await page.click('text=File');
    await page.click('.lm-Menu ul[role="menu"] >> text=New');
    await page.click('#jp-mainmenu-file-new >> text=Terminal');

    // Wait for the xterm.js element to be added in the DOM
    await page.waitForSelector('.jp-Terminal-body');

    await page.keyboard.type('cd $JUPYTERLAB_GALATA_ROOT_DIR');
    await page.keyboard.press('Enter');
    await page.keyboard.type('tree . -L 2');
    await page.keyboard.press('Enter');

    // Wait for command answer
    await page.waitForTimeout(200);

    expect(await page.screenshot()).toMatchSnapshot('terminal_layout.png');
  });

  test('Kernels and Terminals', async ({ page }) => {
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await setSidebarWidth(page);

    // Open a terminal
    await page.click('text=File');
    await page.click('.lm-Menu ul[role="menu"] >> text=New');
    await page.click('#jp-mainmenu-file-new >> text=Terminal');

    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );
    await page.dblclick('text=Data.ipynb');
    await page.dblclick('text=Julia.ipynb');

    await page.click('[title="Running Terminals and Kernels"]');

    await expect(
      page.locator(
        '.jp-RunningSessions-item.jp-mod-kernel >> text="Python 3 (ipykernel)"'
      )
    ).toHaveCount(2);

    expect(
      await page.screenshot({ clip: { y: 27, x: 0, width: 283, height: 400 } })
    ).toMatchSnapshot('running_layout.png');
  });

  test('Command Palette', async ({ page }) => {
    await page.goto();

    await page.keyboard.press('Control+Shift+C');

    expect(
      await (await page.$('#modal-command-palette')).screenshot()
    ).toMatchSnapshot('command_palette.png');
  });

  test('Open With', async ({ page }) => {
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await setSidebarWidth(page);

    await page.click('text=README.md', {
      button: 'right'
    });
    await page.click('text=Open With');
    await page.hover('text=Markdown Preview');

    expect(
      await page.screenshot({ clip: { y: 0, x: 0, width: 700, height: 500 } })
    ).toMatchSnapshot('file_formats_open_with.png');
  });

  test('HTML Display', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    // Hide file browser
    await page.click('[title^="File Browser"]');

    await page.notebook.createNew();
    await page.notebook.setCell(
      0,
      'code',
      "from IPython.display import display, HTML\ndisplay(HTML('<h1>Hello World</h1>'))"
    );

    await page.notebook.run();

    await page.click('text=File');
    await page.click(
      '.lm-Menu ul[role="menu"] >> text=New Console for Notebook'
    );

    await page.click('.jp-CodeConsole-input >> .cm-content');
    await page.keyboard.type(
      "from IPython.display import display, HTML\ndisplay(HTML('<h1>Hello World</h1>'))"
    );
    await page.keyboard.press('Shift+Enter');

    expect(await page.screenshot()).toMatchSnapshot(
      'file_formats_html_display.png'
    );
  });

  test('Altair', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    // Hide file browser
    await page.click('[title^="File Browser"]');

    await page.notebook.createNew();
    await page.notebook.setCell(
      0,
      'code',
      "import altair as alt\n# load a simple dataset as a pandas DataFrame\nfrom vega_datasets import data\ncars = data.cars()\n\nalt.Chart(cars).mark_point().encode(x='Horsepower', y='Miles_per_Gallon', color='Origin').interactive()"
    );

    await page.notebook.run();

    // Need to wait for altair to update the canvas
    await page.waitForSelector('summary');

    // The menu button '...' color of Altair is flaky increase threshold tolerance
    expect(await page.screenshot()).toMatchSnapshot('file_formats_altair.png', {
      threshold: 0.3
    });
  });
});

async function openOverview(page) {
  await page.goto();
  await page.addStyleTag({
    content: `.jp-LabShell.jp-mod-devMode {
      border-top: none;
    }`
  });

  await setSidebarWidth(page);

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
  await page.mouse.move(panelBBox.x + 0.5 * panelBBox.width, 200);
  await page.mouse.up();
}
