// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, IJupyterLabPageFixture, test } from '@jupyterlab/galata';

const fileName = 'notebook.ipynb';

async function populateNotebook(page: IJupyterLabPageFixture) {
  await page.notebook.setCell(0, 'raw', 'Just a raw cell');
  await page.notebook.addCell(
    'markdown',
    '## This is **bold** and *italic* [link to jupyter.org!](http://jupyter.org)'
  );
  await page.notebook.addCell('code', '2 ** 3');
}

/**
 * Adds an item in notebook toolbar using the extension system.
 */
async function addWidgetsInNotebookToolbar(
  page: IJupyterLabPageFixture,
  notebook: string,
  content: string,
  afterElem: string
) {
  await page.notebook.activate(notebook);
  await page.evaluate(
    options => {
      const { content, afterElem } = options;

      // A minimal widget class, with required field for adding an item in toolbar.
      class MinimalWidget {
        constructor(node) {
          this.node = node;
        }
        addClass() {}
        node = null;
        processMessage() {}
        hasClass(name) {
          return false;
        }
        _parent = null;
        get parent() {
          return this._parent;
        }
        set parent(p) {
          this._parent?.layout.removeWidget(this);
          this._parent = p;
        }
      }

      const plugin = {
        id: 'my-test-plugin',
        activate: app => {
          const toolbar = app.shell.activeWidget.toolbar;
          const node = document.createElement('div');
          node.classList.add('jp-CommandToolbarButton');
          node.classList.add('jp-Toolbar-item');
          node.textContent = content;
          const widget = new MinimalWidget(node);
          toolbar.insertAfter(afterElem, content, widget);
        }
      };
      jupyterapp.registerPlugin(plugin);
      jupyterapp.activatePlugin('my-test-plugin');
    },
    { content, afterElem }
  );
}

test.describe('Notebook Toolbar', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(fileName);
    await populateNotebook(page);
  });

  test('Insert cells', async ({ page }) => {
    const imageName = 'insert-cells.png';
    await page.notebook.selectCells(0);
    await page.notebook.clickToolbarItem('insert');
    await page.notebook.selectCells(2);
    await page.notebook.clickToolbarItem('insert');
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Copy-Paste cell', async ({ page }) => {
    const imageName = 'copy-paste-cell.png';
    await page.notebook.selectCells(2);
    await page.notebook.clickToolbarItem('copy');
    await page.notebook.selectCells(0);
    await page.notebook.clickToolbarItem('paste');
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Cut cell', async ({ page }) => {
    const imageName = 'cut-cell.png';
    await page.notebook.selectCells(1);
    await page.notebook.clickToolbarItem('cut');
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Paste cell', async ({ page }) => {
    // Cut cell to populate clipboard
    await page.notebook.selectCells(0);
    await page.notebook.clickToolbarItem('cut');

    const imageName = 'paste-cell.png';
    await page.notebook.selectCells(1);
    await page.notebook.clickToolbarItem('paste');
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    await expect(
      page.locator('.jp-Notebook-cell.jp-mod-active .jp-cell-toolbar')
    ).toBeVisible();
    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Delete cells', async ({ page }) => {
    const imageName = 'delete-cell.png';
    await page.notebook.selectCells(1, 2);
    await page.menu.clickMenuItem('Edit>Delete Cells');
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Run cell', async ({ page }) => {
    const imageName = 'run-cell.png';
    await page.notebook.selectCells(2);

    await page.notebook.clickToolbarItem('run');
    await page.getByText('8', { exact: true }).waitFor();

    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Change cell type to Markdown', async ({ page }) => {
    const imageName = 'change-to-markdown.png';
    await page.notebook.selectCells(2);
    await page.notebook.clickToolbarItem('cellType');
    await page.keyboard.press('m');
    await page.keyboard.press('Enter');
    await page.notebook.selectCells(2);
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });
});

test('Toolbar items act on owner widget', async ({ page }) => {
  // Given two side-by-side notebooks and the second being active
  const file1 = 'notebook1.ipynb';
  await page.notebook.createNew(file1);
  const panel1 = await page.activity.getPanelLocator(file1);
  const tab1 = page.activity.getTabLocator(file1);

  // FIXME Calling a second time `page.notebook.createNew` is not robust
  await page.menu.clickMenuItem('File>New>Notebook');
  try {
    await page.locator('.jp-Dialog').waitFor({ timeout: 5000 });
    await page.click('.jp-Dialog .jp-mod-accept');
  } catch (reason) {
    // no-op
  }

  const tab2 = page.activity.getTabLocator();

  const tab2BBox = await tab2.boundingBox();
  await page.mouse.move(
    tab2BBox.x + 0.5 * tab2BBox.width,
    tab2BBox.y + 0.5 * tab2BBox.height
  );
  await page.mouse.down();
  await page.mouse.move(900, tab2BBox.y + tab2BBox.height + 200);
  await page.mouse.up();

  const classlist = await tab1.getAttribute('class');
  expect(classlist.split(' ')).not.toContain('jp-mod-current');

  // When clicking on toolbar item of the first file
  await panel1
    ?.locator('jp-button[data-command="notebook:insert-cell-below"]')
    .first()
    .click();

  // Then the first file is activated and the action is performed
  const classlistEnd = await tab1.getAttribute('class');
  expect(classlistEnd.split(' ')).toContain('jp-mod-current');
  expect(await page.notebook.getCellCount()).toEqual(2);
});

test.describe('Reactive toolbar', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(fileName);
  });

  test('Reducing toolbar width should display opener item', async ({
    page
  }) => {
    const toolbar = page.locator('.jp-NotebookPanel-toolbar');
    await expect(toolbar.locator('.jp-Toolbar-item:visible')).toHaveCount(14);
    await expect(
      toolbar.locator('.jp-Toolbar-responsive-opener')
    ).not.toBeVisible();

    await page.sidebar.setWidth(520);

    await expect(
      toolbar.locator('.jp-Toolbar-responsive-opener')
    ).toBeVisible();

    await expect(toolbar.locator('.jp-Toolbar-item:visible')).toHaveCount(12);
  });

  test('Items in popup toolbar should have the same order', async ({
    page
  }) => {
    const toolbar = page.locator('.jp-NotebookPanel-toolbar');

    await page.sidebar.setWidth(520);

    await toolbar.locator('.jp-Toolbar-responsive-opener').click();

    // A 'visible' selector is added because there is another response popup element
    // when running in playwright (don't know where it come from, it is an empty
    // toolbar).
    const popupToolbar = page.locator(
      'body > .jp-Toolbar-responsive-popup:visible'
    );
    const popupToolbarItems = popupToolbar.locator('.jp-Toolbar-item:visible');
    await expect(popupToolbarItems).toHaveCount(3);

    const itemChildClasses = [
      '.jp-DebuggerBugButton',
      '.jp-Toolbar-kernelName',
      '.jp-Notebook-ExecutionIndicator'
    ];

    for (let i = 0; i < (await popupToolbarItems.count()); i++) {
      await expect(
        popupToolbarItems.nth(i).locator(itemChildClasses[i])
      ).toHaveCount(1);
    }
  });

  test('Item added from extension should be correctly placed', async ({
    page
  }) => {
    const toolbar = page.locator('.jp-NotebookPanel-toolbar');
    await addWidgetsInNotebookToolbar(
      page,
      'notebook.ipynb',
      'new item 1',
      'cellType'
    );

    const toolbarItems = toolbar.locator('.jp-Toolbar-item:visible');
    await expect(toolbarItems.nth(10)).toHaveText('new item 1');
  });

  test('Item should be correctly placed after resize', async ({ page }) => {
    const toolbar = page.locator('.jp-NotebookPanel-toolbar');
    await addWidgetsInNotebookToolbar(
      page,
      'notebook.ipynb',
      'new item 1',
      'cellType'
    );

    await page.sidebar.setWidth(600);
    await toolbar.locator('.jp-Toolbar-responsive-opener').click();

    // A 'visible' selector is added because there is another response popup element
    // when running in playwright (don't know where it come from, it is an empty
    // toolbar).
    const popupToolbar = page.locator(
      'body > .jp-Toolbar-responsive-popup:visible'
    );
    const popupToolbarItems = popupToolbar.locator('.jp-Toolbar-item:visible');

    await expect(popupToolbarItems.nth(1)).toHaveText('new item 1');

    await page.sidebar.setWidth();
    const toolbarItems = toolbar.locator('.jp-Toolbar-item:visible');
    await expect(toolbarItems.nth(10)).toHaveText('new item 1');
  });

  test('Item added from extension should be correctly placed in popup toolbar', async ({
    page
  }) => {
    const toolbar = page.locator('.jp-NotebookPanel-toolbar');

    await page.sidebar.setWidth(600);

    await addWidgetsInNotebookToolbar(
      page,
      'notebook.ipynb',
      'new item 1',
      'cellType'
    );

    await toolbar.locator('.jp-Toolbar-responsive-opener').click();

    // A 'visible' selector is added because there is another response popup element
    // when running in playwright (don't know where it come from, it is an empty
    // toolbar).
    const popupToolbar = page.locator(
      'body > .jp-Toolbar-responsive-popup:visible'
    );
    const popupToolbarItems = popupToolbar.locator('.jp-Toolbar-item:visible');

    await expect(popupToolbarItems.nth(1)).toHaveText('new item 1');
  });

  test('Item should be correctly removed on ignoring', async ({ page }) => {
    const toolbar = page.locator('.jp-NotebookPanel-toolbar');
    const imageName = 'toolbar-items.png';
    await page.evaluate(async () => {
      await window.jupyterapp.commands.execute('settingeditor:open', {
        query: 'Notebook Panel'
      });
    });

    // Ignore Save
    const checkboxLabel = page
      .locator('div.checkbox >> text=Whether the item is ignored or not')
      .first();
    await checkboxLabel.click();

    await page.locator('div.lm-TabBar-tabLabel >> text=Notebook.ipynb').click();
    const saveLocator = toolbar.locator('[data-jp-item-name="save"]');
    await expect(saveLocator).toHaveCount(0, { timeout: 1000 });

    expect(await toolbar.screenshot()).toMatchSnapshot(imageName);
  });
});
