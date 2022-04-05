// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { galata, test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import {
  generateArrow,
  generateCaptureArea,
  positionMouse,
  setLeftSidebarWidth
} from './utils';

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  viewport: { height: 720, width: 1280 }
});

test.describe('General', () => {
  test('Welcome', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page);
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await setLeftSidebarWidth(page);

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
    await page.click('ul[role="menu"] >> text=New');
    await page.click('#jp-mainmenu-file-new >> text=Terminal');

    await page.click('text=File');
    await page.click('ul[role="menu"] >> text=New');
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

    await setLeftSidebarWidth(page);

    await page.dblclick('[aria-label="File Browser Section"] >> text=data');

    // Inject capture zone
    await page.evaluate(
      ([zone]) => {
        document.body.insertAdjacentHTML('beforeend', zone);
      },
      [generateCaptureArea({ top: 31, left: 0, width: 283, height: 400 })]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('interface_left.png');
  });

  test('Right Sidebar', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await setLeftSidebarWidth(page);

    await page.notebook.createNew();
    await page.click('[title="Property Inspector"]');

    // Inject capture zone
    await page.evaluate(
      ([zone]) => {
        document.body.insertAdjacentHTML('beforeend', zone);
      },
      [generateCaptureArea({ top: 32, left: 997, width: 283, height: 400 })]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('interface_right.png');
  });

  test('Open tabs', async ({ page }) => {
    await openOverview(page);

    await page.click('[title="Running Terminals and Kernels"]');

    // Inject capture zone
    await page.evaluate(
      ([zone]) => {
        document.body.insertAdjacentHTML('beforeend', zone);
      },
      [generateCaptureArea({ top: 27, left: 0, width: 283, height: 400 })]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('interface_tabs.png');
  });

  test('Tabs menu', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page);
    await openOverview(page);

    await page.click('text="Tabs"');

    // Inject capture zone
    await page.evaluate(
      ([zone]) => {
        document.body.insertAdjacentHTML('beforeend', zone);
      },
      [generateCaptureArea({ top: 0, left: 210, width: 700, height: 350 })]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
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

    // Inject arrow and capture zone
    await page.evaluate(
      ([arrow, zone]) => {
        document.body.insertAdjacentHTML('beforeend', arrow + zone);
      },
      [
        generateArrow({ x: 50, y: 55 }, -30),
        generateCaptureArea({ top: 27, left: 0, width: 283, height: 400 })
      ]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
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
    await page.click('ul[role="menu"] >> text=New');

    // Inject mouse and capture zone
    await page.evaluate(
      ([mouse, zone]) => {
        document.body.insertAdjacentHTML('beforeend', mouse + zone);
      },
      [
        positionMouse({ x: 35, y: 35 }),
        generateCaptureArea({ top: 0, left: 0, width: 620, height: 400 })
      ]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('files_menu_top.png');
  });

  test('Shareable link', async ({ page }) => {
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await setLeftSidebarWidth(page);

    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );

    await page.click('text=Lorenz.ipynb', { button: 'right' });
    await page.hover('text=Copy Shareable Link');

    // Inject mouse and capture zone
    await page.evaluate(
      ([mouse, zone]) => {
        document.body.insertAdjacentHTML('beforeend', mouse + zone);
      },
      [
        positionMouse({ x: 260, y: 350 }),
        generateCaptureArea({ top: 0, left: 0, width: 500, height: 500 })
      ]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
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
    await page.click('ul[role="menu"] >> text=New');
    await page.hover('ul[role="menu"] >> text=Text File');

    // Inject mouse and capture zone
    await page.evaluate(
      ([mouse, zone]) => {
        document.body.insertAdjacentHTML('beforeend', mouse + zone);
      },
      [
        positionMouse({ x: 500, y: 110 }),
        generateCaptureArea({ top: 0, left: 0, width: 620, height: 400 })
      ]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
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

    await setLeftSidebarWidth(page);

    // Open jupyterlab.md
    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=narrative'
    );
    await page.dblclick('text=jupyterlab.md');

    await page.click('text=Settings');
    await page.click('ul[role="menu"] >> text=Text Editor Key Map');

    // Inject capture zone
    await page.evaluate(
      ([zone]) => {
        document.body.insertAdjacentHTML('beforeend', zone);
      },
      [generateCaptureArea({ top: 0, left: 260, width: 600, height: 450 })]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('file_editor_settings.png');
  });

  test('Notebook', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page);
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await setLeftSidebarWidth(page);

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

    // Relax threshold as displayed map may change a bit (in particular text positioning)
    expect(await page.screenshot()).toMatchSnapshot('notebook_ui.png', {
      threshold: 0.3
    });
  });

  test('Terminals', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page);
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await setLeftSidebarWidth(page);

    // Open Data.ipynb
    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );
    await page.dblclick('text=Data.ipynb');

    // Open a terminal
    await page.click('text=File');
    await page.click('ul[role="menu"] >> text=New');
    await page.click('#jp-mainmenu-file-new >> text=Terminal');

    await page.waitForSelector('.jp-Terminal');

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

    await setLeftSidebarWidth(page);

    // Open a terminal
    await page.click('text=File');
    await page.click('ul[role="menu"] >> text=New');
    await page.click('#jp-mainmenu-file-new >> text=Terminal');

    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );
    await page.dblclick('text=Data.ipynb');
    await page.dblclick('text=Julia.ipynb');

    await page.click('[title="Running Terminals and Kernels"]');

    // Inject capture zone
    await page.evaluate(
      ([zone]) => {
        document.body.insertAdjacentHTML('beforeend', zone);
      },
      [generateCaptureArea({ top: 27, left: 0, width: 283, height: 400 })]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
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

    await setLeftSidebarWidth(page);

    await page.click('text=README.md', {
      button: 'right'
    });
    await page.click('text=Open With');
    await page.hover('text=Markdown Preview');

    // Inject capture zone
    await page.evaluate(
      ([zone]) => {
        document.body.insertAdjacentHTML('beforeend', zone);
      },
      [generateCaptureArea({ top: 0, left: 0, width: 700, height: 500 })]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
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
    await page.click('ul[role="menu"] >> text=New Console for Notebook');

    await page.click('.jp-CodeConsole-input >> pre[role="presentation"]');
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

  test('VDOM', async ({ page, tmpPath }) => {
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
      "from IPython.display import display\nfrom vdom.helpers import h1, p, img, div, b\n\ndisplay(\ndiv(\nh1('Our Incredibly Declarative Example'),\np('Can you believe we wrote this ', b('in Python'), '?'),\nimg(src='https://turnoff.us/image/en/death-and-the-programmer.png', style={'height': '268px'}),\np('What will ', b('you'), ' create next?')))"
    );

    await page.notebook.run();

    expect(await page.screenshot()).toMatchSnapshot(
      'file_formats_nteract_vdom.png'
    );
  });
});

async function openOverview(page) {
  await page.goto();
  await page.addStyleTag({
    content: `.jp-LabShell.jp-mod-devMode {
      border-top: none;
    }`
  });

  await setLeftSidebarWidth(page);

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
