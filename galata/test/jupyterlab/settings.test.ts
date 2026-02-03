// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IJupyterLabPageFixture } from '@jupyterlab/galata';
import { test } from '@jupyterlab/galata';
import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { changeCodeFontSize, getFileListFontSize } from './utils';

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

  expect
    .soft(await pluginList.screenshot())
    .toMatchSnapshot('settings-plugin-list.png');

  const settingsPanel = page.locator('.jp-SettingsPanel');

  expect
    .soft(await settingsPanel.screenshot())
    .toMatchSnapshot('settings-panel.png');
  // Test that new query takes effect
  await expect(page.locator('.jp-PluginList-entry')).toHaveCount(1);

  await page.evaluate(async () => {
    await window.jupyterapp.commands.execute('settingeditor:open', {
      query: 'CodeMirror'
    });
  });
  // wait for command to be executed
  const fistListEntry = page.locator('.jp-PluginList-entry-label-text').first();

  await expect(fistListEntry).toHaveText('CodeMirror');
});

test.describe('change font-size', () => {
  // We wrap the font size comparisons in `expect().toPass()`
  // because clicking on the menu only triggers the asynchronous
  // update which might take a fraction on second to propagate
  // due to the settings API network latency. This in past led
  // to flaky tests.
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
    await markdownFile.pressSequentially('markdown cell');
    await page.keyboard.press('Control');
    await page.keyboard.press('s');
  };
  const getCodeCellFontSize = async (page: IJupyterLabPageFixture) => {
    const cellElement = page.locator(
      'div.lm-Widget.jp-Cell.jp-CodeCell.jp-Notebook-cell.jp-mod-noOutputs.jp-mod-active.jp-mod-selected .cm-line'
    );
    const newFontSize = await cellElement.evaluate(
      el => getComputedStyle(el).fontSize
    );
    return parseInt(newFontSize);
  };
  const getMarkdownFontSize = async (page: IJupyterLabPageFixture) => {
    const markdownElement = page.locator('.jp-RenderedHTMLCommon');
    await markdownElement.waitFor();
    const newFontSize = await markdownElement.evaluate(
      el => getComputedStyle(el).fontSize
    );
    return parseInt(newFontSize);
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

    await expect(async () => {
      const newFontSize = await cellElement.evaluate(
        el => getComputedStyle(el).fontSize
      );
      expect(newFontSize).toEqual(`${fontSize + 1}px`);
    }).toPass();
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

    await expect(async () => {
      const newFontSize = await cellElement.evaluate(
        el => getComputedStyle(el).fontSize
      );
      expect(newFontSize).toEqual(`${fontSize - 1}px`);
    }).toPass();
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

    await expect(async () => {
      const newFontSize = await fileElement.evaluate(
        el => getComputedStyle(el).fontSize
      );
      expect(newFontSize).toEqual(`${fontSize + 1}px`);
    }).toPass();
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

    await expect(async () => {
      const newFontSize = await fileElement.evaluate(
        el => getComputedStyle(el).fontSize
      );
      expect(newFontSize).toEqual(`${fontSize - 1}px`);
    }).toPass();
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

    await expect(async () => {
      const newFontSize = await fileElement.evaluate(
        el => getComputedStyle(el).fontSize
      );
      expect(newFontSize).toEqual(`${fontSize + 1}px`);
    }).toPass();
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

    await expect(async () => {
      const newFontSize = await fileElement.evaluate(
        el => getComputedStyle(el).fontSize
      );
      expect(newFontSize).toEqual(`${fontSize - 1}px`);
    }).toPass();
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
  let locators: Locator[] = [];
  for (const selectText of textList) {
    let locator = page.getByLabel(selectText);
    await locator.click();
    // Workaround for bug https://github.com/jupyterlab/jupyterlab/issues/18458
    await page.waitForTimeout(50);
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

test('Keyboard Shortcuts: overwriting a shortcut can be cancelled', async ({
  page
}) => {
  // Settings are wide, hide the sidebar to increase available space
  await page.sidebar.close();

  await page.evaluate(async () => {
    await window.jupyterapp.commands.execute('settingeditor:open', {
      query: 'Keyboard Shortcuts'
    });
  });

  const shortcutsForm = page.locator('.jp-Shortcuts-ShortcutUI');
  const filterInput = shortcutsForm.locator('jp-search.jp-FilterBox');
  await filterInput.locator('input').fill('merge cell below');

  const addShortcutButton = shortcutsForm.locator('.jp-Shortcuts-Plus');
  await expect(addShortcutButton).toHaveCount(1);

  const conflict = shortcutsForm.locator('.jp-Shortcuts-Conflict');
  await expect(conflict).toHaveCount(0);

  await addShortcutButton.click();

  const newShortcutInput = shortcutsForm.locator('.jp-Shortcuts-InputBoxNew');
  await newShortcutInput.press('Shift+M');

  await expect(conflict).toHaveCount(1);

  expect(await conflict.screenshot()).toMatchSnapshot(
    'settings-shortcuts-conflict.png'
  );
  const cancelButton = conflict.locator('button >> text=Cancel');
  await cancelButton.click();

  await expect(conflict).toHaveCount(0);
});

test('Keyboard Shortcuts: validate "Or" button behavior when editing shortcuts', async ({
  page
}) => {
  await page.evaluate(async () => {
    await window.jupyterapp.commands.execute('settingeditor:open', {
      query: 'Keyboard Shortcuts'
    });
  });

  const shortcutsForm = page.locator('.jp-Shortcuts-ShortcutUI');
  const filterInput = shortcutsForm.locator('jp-search.jp-FilterBox');
  await filterInput.locator('input').fill('merge cell below');

  const shortcutsContainer = page.locator(
    '.jp-Shortcuts-ShortcutListContainer'
  );
  const firstRow = shortcutsContainer.locator('.jp-Shortcuts-Row').first();

  const shortcutKey = firstRow.locator('.jp-Shortcuts-ShortcutKeys').first();
  await shortcutKey.click();
  await page.waitForTimeout(300);
  await firstRow.hover();
  expect(await firstRow.screenshot()).toMatchSnapshot(
    'settings-shortcuts-edit.png'
  );
});

test('Keyboard Shortcuts: should show/hide the add shortcut row', async ({
  page
}) => {
  await page.evaluate(async () => {
    await window.jupyterapp.commands.execute('settingeditor:open', {
      query: 'Keyboard Shortcuts'
    });
  });

  const shortcutsForm = page.locator('.jp-Shortcuts-ShortcutUI');
  const addShortcutRow = shortcutsForm.locator('.jp-Shortcuts-Row-newShortcut');
  const rows = shortcutsForm.locator('.jp-Shortcuts-Row');
  // Wait for the shortcuts to be displayed.
  await rows.first().waitFor();

  // Expect the add shortcut row to not be attached by default.
  await expect(addShortcutRow).not.toBeAttached();

  // Show the add shortcut row.
  await shortcutsForm.getByTitle('Tool for adding shortcuts').click();
  await expect(addShortcutRow).toBeAttached();

  // Hide the add shortcut row
  await addShortcutRow.getByTitle('Hide row').click();
  await expect(addShortcutRow).not.toBeAttached();
});

test('Keyboard Shortcuts: should filter commands in add shortcut row', async ({
  page
}) => {
  await page.evaluate(async () => {
    await window.jupyterapp.commands.execute('settingeditor:open', {
      query: 'Keyboard Shortcuts'
    });
  });

  const shortcutsForm = page.locator('.jp-Shortcuts-ShortcutUI');
  const addShortcutRow = shortcutsForm.locator('.jp-Shortcuts-Row-newShortcut');

  // Locator to all options except the empty one.
  const commandOptions = addShortcutRow.locator(
    'select option:not([value=""])'
  );

  // Show the add shortcut row and count initial commands.
  await shortcutsForm.getByTitle('Tool for adding shortcuts').click();
  const initialCount = await commandOptions.count();

  // Filtering on notebook should reduce the count.
  const filterInput = shortcutsForm.locator('jp-search.jp-FilterBox');
  await filterInput.locator('input').fill('notebook');
  expect(await commandOptions.count()).toBeLessThan(initialCount);

  // Filtering on a specific command should keep only one command.
  await filterInput.locator('input').fill('restart kernel and run all cells');
  expect(await commandOptions.count()).toBe(1);
});

test('Keyboard Shortcuts: should add a new shortcut', async ({ page }) => {
  // Function that get the shortcuts related to a command.
  const getShortcut = async (command: string) => {
    return await page.evaluate(async command => {
      const settingsRegistry = window.jupyterapp.pluginRegistry._plugins.get(
        '@jupyterlab/apputils-extension:settings'
      ).service;
      const shortcuts = (
        await settingsRegistry.load('@jupyterlab/shortcuts-extension:shortcuts')
      ).composite.shortcuts as any[];
      return shortcuts.filter(shortcut => shortcut.command === command);
    }, command);
  };

  await page.evaluate(async () => {
    await window.jupyterapp.commands.execute('settingeditor:open', {
      query: 'Keyboard Shortcuts'
    });
  });

  const selector = '.jp-Notebook';
  const args = { a: 'b' };

  // Ensure there is no shortcut defined yet for 'notebook:restart-run-all'.
  expect(await getShortcut('notebook:restart-run-all')).toHaveLength(0);

  const shortcutsForm = page.locator('.jp-Shortcuts-ShortcutUI');
  const addShortcutRow = shortcutsForm.locator('.jp-Shortcuts-Row-newShortcut');

  // Show the add shortcut row.
  await shortcutsForm.getByTitle('Tool for adding shortcuts').click();

  // Select the command.
  await addShortcutRow
    .locator('select')
    .selectOption('notebook: Restart Kernel and Run All Cells…');
  // Display the shortcut input and add a shortcut.
  await addShortcutRow.locator('.jp-Shortcuts-EmptyCell').first().hover();
  await addShortcutRow.locator('.jp-Shortcuts-EmptyCell a').click();
  const shortcutKey = addShortcutRow.locator('.jp-Shortcuts-Input').first();
  await shortcutKey.press('Control+r');
  await addShortcutRow.locator('.jp-Shortcuts-Submit').click();

  // Open the custom command dialog.
  await addShortcutRow.getByTitle('Custom options').waitFor();
  await addShortcutRow.getByTitle('Custom options').click();

  // Fill some custom value for the selector and the args.
  const dialog = page.locator('.jp-Dialog-content');
  await dialog.waitFor();
  await dialog.getByRole('textbox').first().fill(selector);
  const jsonEditorLine = dialog.locator('.jp-JSONEditor-host .cm-line').first();
  await jsonEditorLine.click();
  await jsonEditorLine.selectText();
  await jsonEditorLine.fill(JSON.stringify(args));
  await dialog.locator('button.jp-mod-accept').click();
  await dialog.waitFor({ state: 'detached' });

  // Save the new shortcut.
  await addShortcutRow.getByTitle('Save shortcut').click();
  await addShortcutRow.waitFor({ state: 'detached' });

  // The shortcut should now be listed with the correct selector and args.
  const shortcut = await getShortcut('notebook:restart-run-all');
  expect(shortcut).toHaveLength(1);
  expect(shortcut[0].selector).toBe(selector);
  expect(JSON.stringify(shortcut[0].args)).toBe(JSON.stringify(args));
});

test('Settings Export: Clicking the export button triggers a download and matches content', async ({
  page
}) => {
  await page.evaluate(async () => {
    await window.jupyterapp.commands.execute('settingeditor:open', {
      query: 'Theme'
    });
  });
  await page
    .locator(
      '#jp-SettingsEditor-\\@jupyterlab\\/apputils-extension\\:themes_adaptive-theme'
    )
    .click();
  // Wait for the settings to be loaded
  await page.waitForTimeout(500);

  const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
  await page.locator('.jp-ToolbarButtonComponent:has-text("Export")').click();
  const download = await downloadPromise;
  // path where the file will be saved
  const downloadDir = 'temporary/downloads';
  const downloadPath = path.join(downloadDir, download.suggestedFilename());

  // Ensure the download directory exists
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }
  await download.saveAs(downloadPath);

  const fileContent = fs.readFileSync(downloadPath, 'utf-8');
  const expectedContent = `"adaptive-theme": true,`;
  expect(fileContent).toContain(expectedContent);
  fs.unlinkSync(downloadPath);
});

test('Settings Changes Are Reflected in Form Editor"', async ({ page }) => {
  await page.evaluate(async () => {
    await window.jupyterapp.commands.execute('settingeditor:open', {
      query: 'Theme'
    });
  });
  await page.menu.clickMenuItem('Settings>Theme>Theme Scrollbars');
  await expect(
    page.locator(
      '#jp-SettingsEditor-\\@jupyterlab\\/apputils-extension\\:themes_theme-scrollbars'
    )
  ).toBeChecked();
});

test('Settings Import: Importing a JSON file applies the correct settings', async ({
  page
}) => {
  const settingsToImport = {
    '@jupyterlab/apputils-extension:themes': {
      theme: 'JupyterLab Dark'
    }
  };
  const importDirectory = 'temporary/imports';
  const importFilePath = path.join(
    importDirectory,
    'overrides_settings_test.json'
  );

  // Create directory and write the JSON file
  fs.mkdirSync(importDirectory, { recursive: true });
  fs.writeFileSync(importFilePath, JSON.stringify(settingsToImport, null, 2));

  await page.sidebar.close();

  await page.evaluate(() => {
    return window.jupyterapp.commands.execute('settingeditor:open');
  });

  // Set up the file chooser listener
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('.jp-ToolbarButtonComponent:has-text("Import")').click()
  ]);
  await fileChooser.setFiles(importFilePath);
  await page.locator('.jp-Button:has-text("Import")').click();

  // Fetch and verify the applied settings
  const appliedSettings = await page.evaluate(() => {
    return window.jupyterapp.serviceManager.settings.fetch(
      '@jupyterlab/apputils-extension:themes'
    );
  });

  expect(appliedSettings.raw).toContain('"theme": "JupyterLab Dark"');

  fs.unlinkSync(importFilePath);
});

test('Ensure that fuzzy filter works properly', async ({ page }) => {
  // Helper function to rename a notebook
  const renameFile = async (oldName: string, newName: string) => {
    await page
      .locator(`.jp-DirListing-itemName:has-text("${oldName}")`)
      .click();
    await page.keyboard.press('F2');
    await page.keyboard.type(newName);
    await page.keyboard.press('Enter');
  };

  // Create and rename the first file
  await page.menu.clickMenuItem('File>New>Text File');
  await renameFile('untitled.txt', 'test');

  // Create and rename the second file
  await page.menu.clickMenuItem('File>New>Text File');
  await renameFile('untitled.txt', 'tst');

  // Enable file filter and apply a filter for "tst"
  await page.evaluate(() =>
    window.jupyterapp.commands.execute('filebrowser:toggle-file-filter')
  );
  await page.locator('input[placeholder="Filter files by name"]').fill('tst');

  // Both files should be visible
  await expect(page.locator('.jp-DirListing-item')).toHaveCount(2);

  // Change fuzzy filter setting
  await page.evaluate(() =>
    window.jupyterapp.commands.execute('settingeditor:open', {
      query: 'File Browser'
    })
  );
  await page
    .locator('label:has-text("Filter on file name with a fuzzy search")')
    .click();

  // Only one file should be visible
  await expect(page.locator('.jp-DirListing-item')).toHaveCount(1);
});

test('Read-only cells should remain read-only after changing settings', async ({
  page
}) => {
  await page.notebook.createNew();
  await page.sidebar.close();
  await page.notebook.setCell(0, 'code', '"test"');

  // Set the cell to read-only using the Property Inspector
  await page.menu.clickMenuItem('View>Property Inspector');
  await page.locator('.jp-Collapse:has-text("Common Tools")').click();
  await page
    .locator('select:has-text("Editable")')
    .selectOption({ label: 'Read-Only' });

  // Change a notebook setting (kernel preference)
  await page.notebook
    .getToolbarItemLocator('kernelName')
    .then(item => item?.click());
  await page.locator('.jp-Dialog-checkbox').click();
  await page.locator('.jp-Dialog-button:has-text("Select")').click();

  // Assert the first cell is still read-only
  const cell = page.locator('.jp-Notebook-cell').nth(0);
  await expect(cell.locator('.jp-mod-readOnly')).toHaveCount(1);
});
test('Setting for "Show Filter Bar by Default" should work on reload', async ({
  page
}) => {
  const filterBox = page.locator(
    '.jp-FileBrowser-filterBox input[placeholder="Filter files by name"]'
  );

  await expect(filterBox).toBeHidden();

  await page.evaluate(() =>
    window.jupyterapp.commands.execute('settingeditor:open', {
      query: 'Show Filter Bar by Default'
    })
  );

  const settingsForm = page.locator('.jp-SettingsForm');
  const settingCheckbox = settingsForm.getByLabel(
    'Show Filter Bar by Default',
    { exact: true }
  );
  const modifiedIndicator = settingsForm.locator('.jp-modifiedIndicator');
  await settingCheckbox.click();
  await page.locator('button.jp-RestoreButton').waitFor();
  await expect(modifiedIndicator).toBeVisible();

  await page.reload({ waitForIsReady: false });
  await expect(filterBox).toBeVisible();
  await page.evaluate(() =>
    window.jupyterapp.commands.execute('settingeditor:open', {
      query: 'Show Filter Bar by Default'
    })
  );

  // turn the setting OFF
  await settingCheckbox.click();
  await page.locator('button.jp-RestoreButton').waitFor({ state: 'hidden' });
  await expect(modifiedIndicator).toBeHidden();
  await page.reload({ waitForIsReady: false });

  // The filter bar should now be hidden oonce the setting is disabled
  await expect(filterBox).toBeHidden();
});
