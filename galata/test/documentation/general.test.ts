// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import path from 'path';
import {
  filterContent,
  freeezeKernelIds,
  generateArrow,
  positionMouse,
  positionMouseOver
} from './utils';

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  viewport: { height: 720, width: 1280 }
});

test.describe('General', () => {
  test('Welcome', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page, filterContent);
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await page.sidebar.setWidth();

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

    const cell = page.locator(
      '[aria-label="Code Cell Content with Output"] >> text=interactive'
    );
    await cell.click();
    await page.keyboard.press('ContextMenu');
    await page.click('text=Create New View for Cell Output');

    // Emulate drag and drop
    const viewerHandle = page.locator(
      '.lm-TabBar-tabLabel:text-is("lorenz.py")'
    );
    await viewerHandle.click();
    const viewerBBox = await viewerHandle.boundingBox();

    await page.mouse.move(
      viewerBBox.x + 0.5 * viewerBBox.width,
      viewerBBox.y + 0.5 * viewerBBox.height
    );
    await page.mouse.down();
    await page.mouse.move(viewerBBox.x + 0.5 * viewerBBox.width, 600);
    await page.mouse.up();

    // wait for the debugger bug icon to settle
    const panel = (await page.activity.getPanelLocator('Lorenz.ipynb'))!;
    await panel
      .locator('.jp-DebuggerBugButton[aria-disabled="false"]')
      .waitFor();

    expect(await page.screenshot()).toMatchSnapshot('jupyterlab.png');
  });

  test('Left Sidebar', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page, filterContent);
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await page.sidebar.setWidth();

    await page.dblclick('[aria-label="File Browser Section"] >> text=data');
    // Wait for the `data` folder to load to have something to blur
    await page.locator('text=1024px').waitFor();

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
    await page.sidebar.setWidth(251, 'right');

    expect(
      await page.screenshot({
        clip: { y: 32, x: 997, width: 283, height: 400 }
      })
    ).toMatchSnapshot('interface_right.png');

    await page.click('.jp-PropertyInspector >> text=Common Tools');

    await expect(
      page.locator('.jp-ActiveCellTool .jp-InputPrompt')
    ).not.toBeEmpty();
    await expect(
      page.locator('.jp-ActiveCellTool .jp-InputPrompt')
    ).not.toHaveClass(/lm-mod-hidden/);

    expect(
      await page.screenshot({
        clip: { y: 32, x: 997, width: 283, height: 400 }
      })
    ).toMatchSnapshot('interface_right_common.png');

    // Expect the 'Raw NbConvert Format' field to be displayed only on raw cells
    await expect(
      page.locator(
        '.jp-NotebookTools-tool .jp-FormGroup-fieldLabel:text("Raw NBConvert Format")'
      )
    ).toHaveCount(0);
    await page.notebook.addCell('raw', 'Raw cell');
    await expect(
      page.locator(
        '.jp-NotebookTools-tool .jp-FormGroup-fieldLabel:text("Raw NBConvert Format")'
      )
    ).toHaveCount(1);

    // Open Advanced tools and get metadata content
    await page.click('.jp-PropertyInspector >> text=Advanced Tools');
    await expect(
      page.locator('.jp-MetadataForm .jp-MetadataEditorTool')
    ).toHaveCount(2);
    const cellMetadata = await page
      .locator('.jp-MetadataForm .jp-MetadataEditorTool')
      .first()
      .textContent();
    const notebookMetadata = await page
      .locator('.jp-MetadataForm .jp-MetadataEditorTool')
      .last()
      .textContent();
    expect(cellMetadata).toContain('"tags": []');
    expect(notebookMetadata).not.toContain('"base_numbering"');

    // Expect adding tag is reflected in CellMetadataEditor
    await page.click('.jp-CellTags .jp-CellTags-Add');
    await page.keyboard.type('test-tag');
    await page.keyboard.press('Enter');
    await expect(
      page.locator('.jp-CellTags .jp-CellTags-Holder span').first()
    ).toHaveText('test-tag');

    const newCellMetadata = (
      await page
        .locator('.jp-MetadataForm .jp-MetadataEditorTool')
        .first()
        .textContent()
    )?.replace(/\s/g, '');
    expect(newCellMetadata).toContain('"tags":["test-tag"]');

    // Expect modifying 'toc base number' value is reflected in NotebookMetadataEditor
    await page
      .locator('.jp-MetadataForm input[label="Table of content - Base number"]')
      .fill('3');
    const newNotebookMetadata = (
      await page
        .locator('.jp-MetadataForm .jp-MetadataEditorTool')
        .last()
        .textContent()
    )?.replace(/\s/g, '');
    expect(newNotebookMetadata).toContain('"base_numbering":3');

    // Test the active cell widget
    await expect(
      page.locator('.jp-ActiveCellTool .jp-ActiveCellTool-Content pre')
    ).toHaveText('Raw cell');
    await expect(
      page.locator('.jp-ActiveCellTool .jp-InputPrompt')
    ).toHaveClass(/lm-mod-hidden/);
    await (await page.notebook.getCellInputLocator(1))?.click();
    await page.keyboard.type(' content');
    await expect(
      page.locator('.jp-ActiveCellTool .jp-ActiveCellTool-Content pre')
    ).toHaveText('Raw cell content');

    await page.notebook.addCell('code', 'print("test")');
    await expect(
      page.locator('.jp-ActiveCellTool .jp-ActiveCellTool-Content pre')
    ).toHaveText('print("test")');
    await expect(
      page.locator('.jp-ActiveCellTool .jp-InputPrompt')
    ).not.toHaveClass(/lm-mod-hidden/);
    await expect(page.locator('.jp-ActiveCellTool .jp-InputPrompt')).toHaveText(
      '[ ]:'
    );

    await page.notebook.runCell(2, true);
    await expect(page.locator('.jp-ActiveCellTool .jp-InputPrompt')).toHaveText(
      '[1]:'
    );
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
    const fileMenuNewItem = page
      .locator('.lm-Menu ul[role="menu"]')
      .getByText('New', { exact: true });
    await fileMenuNewItem.waitFor();
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

    await page.sidebar.setWidth();

    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );

    await page.click('text=Lorenz.ipynb', { button: 'right' });
    await page.hover('text=Copy Shareable Link');

    const itemLocator = page.locator('text=Copy Shareable Link');

    // Inject mouse
    await page.evaluate(
      ([mouse]) => {
        document.body.insertAdjacentHTML('beforeend', mouse);
      },
      [await positionMouseOver(itemLocator, { top: 0.5, left: 0.55 })]
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

    await page.sidebar.setWidth();

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

    await page.sidebar.setWidth();

    // Open Data.ipynb
    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );
    await page.dblclick('text=Data.ipynb');
    await page.menu.clickMenuItem('Edit>Clear Outputs of All Cells');
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
      maxDiffPixelRatio: 0.02
    });
  });

  test('Trust indicator', async ({ page }) => {
    await page.goto();
    // Open Data.ipynb which is not trusted by default
    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );
    await page.dblclick('text=Data.ipynb');

    const trustIndictor = page.locator('.jp-StatusItem-trust');

    expect(await trustIndictor.screenshot()).toMatchSnapshot(
      'notebook_not_trusted.png'
    );

    // Open trust dialog
    // Note: we do not `await` here as it only resolves once dialog is closed
    const trustPromise = page.evaluate(() => {
      return window.jupyterapp.commands.execute('notebook:trust');
    });
    await page.locator('.jp-Dialog-content').waitFor();
    // Accept option to trust the notebook
    await page.click('.jp-Dialog-button.jp-mod-accept');
    // Wait until dialog is gone
    await trustPromise;

    expect(await trustIndictor.screenshot()).toMatchSnapshot(
      'notebook_trusted.png'
    );
  });

  test('Heading anchor', async ({ page }, testInfo) => {
    await page.goto();
    await page.sidebar.setWidth();

    // Open Data.ipynb
    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );
    await page.dblclick('text=Data.ipynb');

    const heading = page.locator(
      'h2[data-jupyter-id="Open-a-CSV-file-using-Pandas"]'
    );
    await heading.waitFor();
    const anchor = heading.locator('text=¶');
    await heading.hover();

    // Get parent cell which includes the heading
    const cell = await heading.evaluateHandle((node: HTMLElement) =>
      node.closest('.jp-Cell')
    );

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

    expect(await cell!.screenshot()).toMatchSnapshot(
      'notebook_heading_anchor_link.png'
    );
  });

  test('Terminal layout', async ({ page, tmpPath }) => {
    await galata.Mock.freezeContentLastModified(page);
    const fileName = 'tree_fixture.txt';
    await page.contents.uploadFile(
      path.resolve(__dirname, `./data/${fileName}`),
      `${tmpPath}/${fileName}`
    );
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await page.sidebar.setWidth();

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
    await page.locator('.jp-Terminal-body').waitFor();

    await page.keyboard.type('cd $JUPYTERLAB_GALATA_ROOT_DIR');
    await page.keyboard.press('Enter');
    await page.keyboard.type(`clear && cat ${tmpPath}/${fileName}`);
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

    await page.sidebar.setWidth();

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

    // Wait up to 5s for both kernels to startup
    await expect
      .soft(page.locator('.jp-RunningSessions-item.jp-mod-kernel'))
      .toHaveCount(2, { timeout: 5000 });

    const sessionsSidebar = page.locator('.jp-SidePanel.jp-RunningSessions');
    const mockedKernelIds = {
      'Data.ipynb': 'abcd1234',
      'Julia.ipynb': 'wxyz5678'
    };

    await freeezeKernelIds(sessionsSidebar, mockedKernelIds);

    expect
      .soft(
        await page.screenshot({
          clip: { y: 27, x: 0, width: 283, height: 400 }
        })
      )
      .toMatchSnapshot('running_layout.png');

    await page.click('jp-button[data-command="running:show-modal"]');

    // Playwright uses shadow-piercing selectors so this works with webcomponents too
    await expect
      .soft(page.locator('.jp-SearchableSessions-modal input'))
      .toBeFocused();

    const dialog = page.locator(
      '.jp-SearchableSessions-modal .jp-Dialog-content'
    );
    await freeezeKernelIds(dialog, mockedKernelIds);

    expect(await dialog.screenshot()).toMatchSnapshot('running_modal.png');
  });

  test('Command Palette', async ({ page }) => {
    await page.goto();

    await page.keyboard.press('Control+Shift+C');

    expect(
      await page.locator('#modal-command-palette').screenshot()
    ).toMatchSnapshot('command_palette.png');
  });

  test('Keyboard Shortcuts Help', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await page.notebook.createNew();

    // Ensure focus on a cell
    await page.notebook.enterCellEditingMode(0);

    await page.keyboard.press('Control+Shift+H');

    expect(await page.locator('.jp-Notebook').screenshot()).toMatchSnapshot(
      'shortcuts_help.png'
    );
  });

  test('Open With', async ({ page }) => {
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await page.sidebar.setWidth();

    await page.dblclick('[aria-label="File Browser Section"] >> text=data');
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
      "from IPython.display import display, HTML\ndisplay(HTML('<h1>Hello World</h1>'))",
      {
        delay: 0
      }
    );
    await page.keyboard.press('Shift+Enter');

    const main = page.getByRole('main');
    expect(await main.screenshot()).toMatchSnapshot(
      'file_formats_html_display.png'
    );
  });

  test('Altair', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    // Hide file browser
    await page.click('[title^="File Browser"]');

    await page.notebook.createNew();
    await page.notebook.setCell(
      0,
      'code',
      "import altair as alt\n# load a simple dataset as a pandas DataFrame\nfrom altair.datasets import data\ncars = data.cars()\n\nalt.Chart(cars).mark_point().encode(x='Horsepower', y='Miles_per_Gallon', color='Origin').interactive()"
    );

    await page.notebook.run();

    // Need to wait for altair to update the canvas
    await page.locator('summary').waitFor();

    const main = page.getByRole('main');

    // The menu button '...' color of Altair is flaky increase threshold tolerance
    expect(await main.screenshot()).toMatchSnapshot('file_formats_altair.png', {
      threshold: 0.3
    });
  });
});
