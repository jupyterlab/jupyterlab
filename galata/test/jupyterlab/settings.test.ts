// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';

test('Open the settings editor with a specific search query', async ({
  page
}) => {
  await page.evaluate(async () => {
    await window.jupyterapp.commands.execute('settingeditor:open', {
      query: 'Command Palette'
    });
  });

  expect(
    await page.locator('.jp-PluginList .jp-FilterBox input').inputValue()
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

  const createNewCodeCell = async page => {
    await page.notebook.createNew(ipynbFileName);
    await page.notebook.addCell('code', '2 + 2');
  };
  const createMarkdownFile = async page => {
    await page.waitForSelector('div[role="main"] >> text=Launcher');
    await page.click('.jp-LauncherCard[title="Create a new markdown file"]');
    return await page.waitForSelector('.jp-FileEditor .cm-content');
  };
  const inputMarkdownFile = async (page, markdownFile) => {
    await markdownFile.focus();
    await markdownFile.type('markdown cell');
    await page.keyboard.press('Control');
    await page.keyboard.press('s');
  };
  const getCodeCellFontSize = async page => {
    const cellElement = await page.$(
      'div.lm-Widget.jp-Cell.jp-CodeCell.jp-Notebook-cell.jp-mod-noOutputs.jp-mod-active.jp-mod-selected .cm-line'
    );
    const computedStyle = await page.evaluate(
      el => getComputedStyle(el),
      cellElement
    );
    return parseInt(computedStyle.fontSize);
  };
  const getMarkdownFontSize = async page => {
    await page.waitForSelector('.jp-RenderedHTMLCommon');
    const markdownElement = await page.$('.jp-RenderedHTMLCommon');
    const computedStyle = await page.evaluate(
      el => getComputedStyle(el),
      markdownElement
    );
    return parseInt(computedStyle.fontSize);
  };
  const getFileListFontSize = async page => {
    await page.waitForSelector(
      '.jp-DirListing-content .jp-DirListing-itemText'
    );
    const itemElement = await page.$(
      '.jp-DirListing-content .jp-DirListing-itemText'
    );
    const computedStyle = await page.evaluate(
      el => getComputedStyle(el),
      itemElement
    );
    return parseInt(computedStyle.fontSize);
  };
  const changeCodeFontSize = async (page, menuOption) => {
    await page.click('text=Settings');
    await page.click('.lm-Menu ul[role="menu"] >> text=Theme');
    await page.click(`.lm-Menu ul[role="menu"] >> text="${menuOption}"`);
  };

  test('should Increase Code Font Size', async ({ page }) => {
    await createNewCodeCell(page);
    const fontSize = await getCodeCellFontSize(page);
    await changeCodeFontSize(page, 'Increase Code Font Size');

    await page.waitForSelector('div[role="main"] >> text=Launcher');
    await page.waitForSelector('.jp-Notebook-cell');

    const cellElement = await page.$(
      'div.lm-Widget.jp-Cell.jp-CodeCell.jp-Notebook-cell.jp-mod-noOutputs.jp-mod-active.jp-mod-selected .cm-line'
    );
    const computedStyle = await page.evaluate(
      el => getComputedStyle(el),
      cellElement
    );
    expect(computedStyle.fontSize).toEqual(`${fontSize + 1}px`);
  });

  test('should Decrease Code Font Size', async ({ page }) => {
    await createNewCodeCell(page);
    const fontSize = await getCodeCellFontSize(page);
    await changeCodeFontSize(page, 'Decrease Code Font Size');

    await page.waitForSelector('div[role="main"] >> text=Launcher');
    await page.waitForSelector('.jp-Notebook-cell');

    const cellElement = await page.$(
      'div.lm-Widget.jp-Cell.jp-CodeCell.jp-Notebook-cell.jp-mod-noOutputs.jp-mod-active.jp-mod-selected .cm-line'
    );
    const computedStyle = await page.evaluate(
      el => getComputedStyle(el),
      cellElement
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

    await page.waitForSelector('.jp-FileEditor .cm-content');
    const fileElement = await page.$('.jp-RenderedHTMLCommon');
    const computedStyle = await page.evaluate(
      el => getComputedStyle(el),
      fileElement
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

    await page.waitForSelector('.jp-FileEditor .cm-content');
    const fileElement = await page.$('.jp-RenderedHTMLCommon');
    const computedStyle = await page.evaluate(
      el => getComputedStyle(el),
      fileElement
    );
    expect(computedStyle.fontSize).toEqual(`${fontSize - 1}px`);
  });

  test('should Increase UI Font Size', async ({ page }) => {
    await page.notebook.createNew(ipynbFileName);
    const fontSize = await getFileListFontSize(page);
    await changeCodeFontSize(page, 'Increase UI Font Size');

    await page.waitForSelector(
      '.jp-DirListing-content .jp-DirListing-itemText'
    );
    const fileElement = await page.$(
      '.jp-DirListing-content .jp-DirListing-itemText'
    );
    const computedStyle = await page.evaluate(
      el => getComputedStyle(el),
      fileElement
    );
    expect(computedStyle.fontSize).toEqual(`${fontSize + 1}px`);
  });

  test('should Decrease UI Font Size', async ({ page }) => {
    await page.notebook.createNew(ipynbFileName);
    const fontSize = await getFileListFontSize(page);
    await changeCodeFontSize(page, 'Decrease UI Font Size');

    await page.waitForSelector(
      '.jp-DirListing-content .jp-DirListing-itemText'
    );
    const fileElement = await page.$(
      '.jp-DirListing-content .jp-DirListing-itemText'
    );
    const computedStyle = await page.evaluate(
      el => getComputedStyle(el),
      fileElement
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

  const textList: Array[string] = [
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
test.describe('shorcuts list @A11y', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(async () => {
      await window.jupyterapp.commands.execute('settingeditor:open', {
        query: 'Keyboard Shortcuts'
      });
    });
    await expect(
      page.locator('.jp-Shortcuts-ShortcutListContainer')
    ).toHaveCount(1);

    const shorcutList = page.locator('.jp-Shortcuts-ShortcutList');
    const shorcutListId = await shorcutList.getAttribute('id');

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('Tab');
      let activeElementId = await page.evaluate(
        () => document.activeElement?.getAttribute('id')
      );
      if (activeElementId === shorcutListId) {
        break;
      }
    }
  });

  test('Should focus shortcuts container using tab key', async ({ page }) => {
    expect(page.locator('.jp-Shortcuts-ShortcutList')).toBeFocused();
  });

  test('Should focus shortcuts container first row using tab key', async ({
    page
  }) => {
    await page.keyboard.press('Tab');

    const shorcutRow = page.locator('.jp-Shortcuts-Row').first();
    await expect(shorcutRow).toBeFocused();
  });

  test('Should retain tab order by focusing property inspector using tab key', async ({
    page
  }) => {
    const propertyInspector = page.getByTitle('Property Inspector');

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('Tab');
      let activeElementTitle = await page.evaluate(
        () => document.activeElement?.getAttribute('title')
      );
      if (activeElementTitle === 'Property Inspector') {
        break;
      }
    }

    await expect(propertyInspector).toBeFocused();
  });

  test('Should retain tab order by focusing seach input using shift tab', async ({
    page
  }) => {
    const searchInput = page.locator('.jp-Shortcuts-Search');
    const searchInputClass = await searchInput.getAttribute('class');

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('Shift+Tab');
      let activeElementClass = await page.evaluate(
        () => document.activeElement?.getAttribute('class')
      );
      if (activeElementClass === searchInputClass) {
        break;
      }
    }

    await expect(searchInput).toBeFocused();
  });
  test('Should enter row and navigate buttons using arrow keys', async ({
    page
  }) => {
    const shortcutRows = page.locator('.jp-Shortcuts-Row');

    for (let i = 0; i < (await shortcutRows.count()); i++) {
      await shortcutRows.nth(i).focus();
      await page.keyboard.press('ArrowRight');
      let activeElementClass = await page.evaluate(
        () => document.activeElement?.getAttribute('class')
      );
      expect(activeElementClass).toContain('jp-Shortcuts-ShortcutKeys');
    }
  });
  test('Should navigate rows using down arrow key', async ({ page }) => {
    await page.keyboard.press('Tab');

    const shortcutRows = page.locator('.jp-Shortcuts-Row');

    for (let i = 0; i < (await shortcutRows.count()) - 1; i++) {
      await shortcutRows.nth(i).focus();
      await page.keyboard.press('ArrowDown');

      if (shortcutRows.nth(i) !== shortcutRows.last()) {
        await expect(shortcutRows.nth(i + 1)).toBeFocused();
      } else if (shortcutRows.nth(i) === shortcutRows.last()) {
        await expect(shortcutRows.first()).toBeFocused();
      }
    }
  });

  test('Should navigate rows using up arrow keys', async ({ page }) => {
    await page.keyboard.press('Tab');

    const shortcutRows = page.locator('.jp-Shortcuts-Row');

    for (let i = 0; i < (await shortcutRows.count()) - 1; i++) {
      await shortcutRows.nth(i).focus();
      await page.keyboard.press('ArrowUp');

      if (shortcutRows.nth(i) !== shortcutRows.first()) {
        await expect(shortcutRows.nth(i - 1)).toBeFocused();
      } else if (shortcutRows.nth(i) === shortcutRows.first()) {
        await expect(shortcutRows.last()).toBeFocused();
      }
    }
  });

  test('Should navigate to parent row from buttons using escape key', async ({
    page
  }) => {
    const shortcutRows = page.locator('.jp-Shortcuts-Row');

    for (let i = 0; i < (await shortcutRows.count()) - 1; i++) {
      const shortcutListButton = shortcutRows.nth(i).locator('button').first();

      await shortcutListButton.focus();

      await page.keyboard.press('Escape');

      expect(shortcutRows.nth(i)).toBeFocused();
    }
  });
});
