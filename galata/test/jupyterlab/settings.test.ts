// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IJupyterLabPageFixture, test } from '@jupyterlab/galata';
import { expect, Locator } from '@playwright/test';

test('Open the settings editor with a specific search query', async ({
  page
}) => {
  await page.evaluate(async () => {
    await window.jupyterapp.commands.execute('settingeditor:open', {
      query: 'Command Palette'
    });
  });

  expect(
    await page
      .locator('.jp-PluginList jp-search')
      .evaluate(elem => (elem as any).value)
  ).toEqual('Command Palette');

  await expect(page.locator('.jp-SettingsForm')).toHaveCount(1);

  const pluginList = page.locator('.jp-PluginList');

  expect(await pluginList.screenshot()).toMatchSnapshot(
    'settings-plugin-list.png'
  );

  const settingsPanel = page.locator('.jp-SettingsPanel');

  expect(await settingsPanel.screenshot()).toMatchSnapshot(
    'settings-panel.png'
  );
});

test.describe('change font-size', () => {
  const ipynbFileName = 'create_test.ipynb';

  const createNewCodeCell = async (page: IJupyterLabPageFixture) => {
    await page.notebook.createNew(ipynbFileName);
    await page.notebook.addCell('code', '2 + 2');
  };
  const createMarkdownFile = async (page: IJupyterLabPageFixture) => {
    await page.locator('div[role="main"] >> text=Launcher').waitFor();
    await page.click('.jp-LauncherCard[title="Create a new markdown file"]');
    await page.locator('.jp-FileEditor .cm-content').waitFor();
    return page.locator('.jp-FileEditor .cm-content');
  };
  const inputMarkdownFile = async (
    page: IJupyterLabPageFixture,
    markdownFile: Locator
  ) => {
    await markdownFile.focus();
    await markdownFile.type('markdown cell');
    await page.keyboard.press('Control');
    await page.keyboard.press('s');
  };
  const getCodeCellFontSize = async (page: IJupyterLabPageFixture) => {
    const cellElement = page.locator(
      'div.lm-Widget.jp-Cell.jp-CodeCell.jp-Notebook-cell.jp-mod-noOutputs.jp-mod-active.jp-mod-selected .cm-line'
    );
    const computedStyle = await cellElement.evaluate(el =>
      getComputedStyle(el)
    );
    return parseInt(computedStyle.fontSize);
  };
  const getMarkdownFontSize = async (page: IJupyterLabPageFixture) => {
    const markdownElement = page.locator('.jp-RenderedHTMLCommon');
    await markdownElement.waitFor();
    const computedStyle = await markdownElement.evaluate(el =>
      getComputedStyle(el)
    );
    return parseInt(computedStyle.fontSize);
  };
  const getFileListFontSize = async (page: IJupyterLabPageFixture) => {
    const itemElement = page.locator(
      '.jp-DirListing-content .jp-DirListing-itemText'
    );
    await itemElement.waitFor();
    const computedStyle = await itemElement.evaluate(el =>
      getComputedStyle(el)
    );
    return parseInt(computedStyle.fontSize);
  };
  const changeCodeFontSize = async (
    page: IJupyterLabPageFixture,
    menuOption
  ) => {
    await page.click('text=Settings');
    await page.click('.lm-Menu ul[role="menu"] >> text=Theme');
    await page.click(`.lm-Menu ul[role="menu"] >> text="${menuOption}"`);
  };

  test('should Increase Code Font Size', async ({ page }) => {
    await createNewCodeCell(page);
    const fontSize = await getCodeCellFontSize(page);
    await changeCodeFontSize(page, 'Increase Code Font Size');

    await page.locator('div[role="main"] >> text=Launcher').waitFor();
    await page.locator('.jp-Notebook-cell').first().waitFor();

    const cellElement = page.locator(
      'div.lm-Widget.jp-Cell.jp-CodeCell.jp-Notebook-cell.jp-mod-noOutputs.jp-mod-active.jp-mod-selected .cm-line'
    );
    const computedStyle = await cellElement.evaluate(el =>
      getComputedStyle(el)
    );
    expect(computedStyle.fontSize).toEqual(`${fontSize + 1}px`);
  });

  test('should Decrease Code Font Size', async ({ page }) => {
    await createNewCodeCell(page);
    const fontSize = await getCodeCellFontSize(page);
    await changeCodeFontSize(page, 'Decrease Code Font Size');

    await page.locator('div[role="main"] >> text=Launcher').waitFor();
    await page.locator('.jp-Notebook-cell').first().waitFor();

    const cellElement = page.locator(
      'div.lm-Widget.jp-Cell.jp-CodeCell.jp-Notebook-cell.jp-mod-noOutputs.jp-mod-active.jp-mod-selected .cm-line'
    );
    const computedStyle = await cellElement.evaluate(el =>
      getComputedStyle(el)
    );
    expect(computedStyle.fontSize).toEqual(`${fontSize - 1}px`);
  });

  test('should Increase Content Font Size', async ({ page }) => {
    const markdownFile = await createMarkdownFile(page);
    await inputMarkdownFile(page, markdownFile);
    await page.evaluate(() => {
      return window.galata.app.commands.execute('fileeditor:markdown-preview');
    });
    const fontSize = await getMarkdownFontSize(page);

    await changeCodeFontSize(page, 'Increase Content Font Size');

    await page.locator('.jp-FileEditor .cm-content').waitFor();
    const fileElement = page.locator('.jp-RenderedHTMLCommon');
    const computedStyle = await fileElement.evaluate(el =>
      getComputedStyle(el)
    );
    expect(computedStyle.fontSize).toEqual(`${fontSize + 1}px`);
  });

  test('should Decrease Content Font Size', async ({ page }) => {
    const markdownFile = await createMarkdownFile(page);
    await inputMarkdownFile(page, markdownFile);
    await page.evaluate(() => {
      return window.galata.app.commands.execute('fileeditor:markdown-preview');
    });
    const fontSize = await getMarkdownFontSize(page);

    await changeCodeFontSize(page, 'Decrease Content Font Size');

    await page.locator('.jp-FileEditor .cm-content').waitFor();
    const fileElement = page.locator('.jp-RenderedHTMLCommon');
    const computedStyle = await fileElement.evaluate(el =>
      getComputedStyle(el)
    );
    expect(computedStyle.fontSize).toEqual(`${fontSize - 1}px`);
  });

  test('should Increase UI Font Size', async ({ page }) => {
    await page.notebook.createNew(ipynbFileName);
    const fontSize = await getFileListFontSize(page);
    await changeCodeFontSize(page, 'Increase UI Font Size');

    await page
      .locator('.jp-DirListing-content .jp-DirListing-itemText')
      .waitFor();
    const fileElement = page.locator(
      '.jp-DirListing-content .jp-DirListing-itemText'
    );
    const computedStyle = await fileElement.evaluate(el =>
      getComputedStyle(el)
    );
    expect(computedStyle.fontSize).toEqual(`${fontSize + 1}px`);
  });

  test('should Decrease UI Font Size', async ({ page }) => {
    await page.notebook.createNew(ipynbFileName);
    const fontSize = await getFileListFontSize(page);
    await changeCodeFontSize(page, 'Decrease UI Font Size');

    await page
      .locator('.jp-DirListing-content .jp-DirListing-itemText')
      .waitFor();
    const fileElement = page.locator(
      '.jp-DirListing-content .jp-DirListing-itemText'
    );
    const computedStyle = await fileElement.evaluate(el =>
      getComputedStyle(el)
    );
    expect(computedStyle.fontSize).toEqual(`${fontSize - 1}px`);
  });
});

test('Check codemirror settings can all be set at the same time.', async ({
  page
}) => {
  await page.evaluate(async () => {
    await window.jupyterapp.commands.execute('settingeditor:open', {
      query: 'CodeMirror'
    });
  });

  await expect(page.locator('.jp-SettingsForm')).toHaveCount(1);

  const textList: Array<string> = [
    'Code Folding',
    'Highlight the active line',
    'Highlight trailing white space',
    'Highlight white space'
  ];
  let locators = [];
  for (const selectText of textList) {
    let locator = page.getByLabel(selectText);
    await locator.click();
    locators.push(locator);
  }
  for (const locator of locators) {
    await expect(locator).toBeChecked();
  }
});

test('Opening Keyboard Shortcuts settings does not mangle user shortcuts', async ({
  page
}) => {
  // Testing against https://github.com/jupyterlab/jupyterlab/issues/12056
  await page.evaluate(async () => {
    await window.jupyterapp.commands.execute('settingeditor:open', {
      query: 'Keyboard Shortcuts'
    });
  });

  await expect(page.locator('.jp-SettingsForm')).toHaveCount(1);

  await page.evaluate(async () => {
    await window.jupyterapp.commands.execute('settingeditor:open-json');
  });

  await expect(page.locator('#json-setting-editor')).toHaveCount(1);
  await page.click(
    '#json-setting-editor .jp-PluginList-entry[data-id="@jupyterlab/shortcuts-extension:shortcuts"]'
  );
  const userPanelLines = await page
    .locator('.jp-SettingsRawEditor-user .cm-line')
    .count();
  expect(userPanelLines).toBeLessThan(10);
});
