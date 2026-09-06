// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';

const DEFAULT_NAME = 'untitled.txt';

const TEST_FILE_CONTENT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam urna
libero, dictum a egestas non, placerat vel neque. In imperdiet iaculis fermentum.
Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia
Curae; Cras augue tortor, tristique vitae varius nec, dictum eu lectus. Pellentesque
id eleifend eros. In non odio in lorem iaculis sollicitudin. In faucibus ante ut
arcu fringilla interdum. Maecenas elit nulla, imperdiet nec blandit et, consequat
ut elit.
in`;

function getSelectionRange(textarea: HTMLTextAreaElement) {
  return {
    start: textarea.selectionStart,
    end: textarea.selectionEnd
  };
}

test.beforeEach(async ({ page }) => {
  await page.menu.clickMenuItem('File>New>Text File');
  await page.locator(`[role="main"] >> text=${DEFAULT_NAME}`).waitFor();
  await page.locator('[role="main"] .cm-content').fill(TEST_FILE_CONTENT);
});

test('Search with a text', async ({ page }) => {
  const searchText = 'ipsum';

  await page.evaluate(async searchText => {
    await window.jupyterapp.commands.execute('documentsearch:start', {
      searchText
    });
  }, searchText);

  await expect(page.locator('[placeholder="Find"]')).toHaveValue(searchText);
});

test('Search with a text and replacement', async ({ page }) => {
  const searchText = 'ipsum';
  const replaceText = 'banana';

  await page.evaluate(
    async ([searchText, replaceText]) => {
      await window.jupyterapp.commands.execute(
        'documentsearch:startWithReplace',
        {
          searchText,
          replaceText
        }
      );
    },
    [searchText, replaceText]
  );

  await expect(page.locator('[placeholder="Find"]')).toHaveValue(searchText);
  await expect(page.locator('[placeholder="Replace"]')).toHaveValue(
    replaceText
  );
});

test('Populate search box with selected text', async ({ page }) => {
  const imageName = 'text-editor-search-from-selection.png';

  // Go to first line
  await page.keyboard.press('PageUp');
  // Select first line
  await page.keyboard.press('Home');
  await page.keyboard.press('Control+Shift+ArrowRight');
  // Open search box
  await page.keyboard.press('Control+f');

  // Expect it to be populated with the first word
  const inputWithFirstWord = page.locator(
    '[placeholder="Find"] >> text="Lorem"'
  );
  await expect.soft(inputWithFirstWord).toBeVisible();
  await expect.soft(inputWithFirstWord).toBeFocused();
  // Expect the newly set text to be selected
  expect
    .soft(await inputWithFirstWord.evaluate(getSelectionRange))
    .toStrictEqual({
      start: 0,
      end: 5
    });

  // Check the CM search panel is not displayed.
  await expect(page.locator('.cm-search.cm-panel')).toHaveCount(0);

  // Expect the first match to be highlighted
  await page.locator('text=1/2').waitFor();

  const tabHandle = await page.activity.getPanelLocator(DEFAULT_NAME);

  expect(await tabHandle?.screenshot()).toMatchSnapshot(imageName);
});

test.describe('File search from selection', () => {
  test('should expand the selection to the next occurrence', async ({
    page
  }) => {
    // This could be improved as the following statement will double click
    // on the last line that will result in the last word being selected.
    await page.getByRole('textbox').getByText('in').last().dblclick();

    await page.keyboard.press('Control+Shift+d');

    await expect(
      page.getByRole('main').locator('.cm-selectionBackground')
    ).toHaveCount(2);
  });

  test('search highlighting', async ({ page }) => {
    const textToType = `True, False, def, assert # keywords
  1, 0.1, 0x21 # numbers
  'a', "b", "f", "c" # strings
  bool, int, open, help # builtins
  True, False, def, assert # keywords
  1, 0.1, 0x21 # numbers
  'a', "b", "f", "c" # strings
  bool, int, open, help # builtins`;

    await page.locator('[role="main"] .cm-content').selectText();
    await page.keyboard.press('Backspace');
    await page.locator('[role="main"] .cm-content').fill(textToType);

    // Open the search bar with Ctrl + F
    await page.keyboard.press('Control+f');

    // Define the search text
    const searchText = `True, False, def, assert # keywords
  1, 0.1, 0x21 # numbers
  'a', "b", "f", "c" # strings
  bool, int, open, help # builtins`;

    // Fill the search query into the search bar
    const searchBox = page.getByPlaceholder('Find');
    await searchBox.fill(searchText);

    // Verify the search input is populated correctly
    await expect(searchBox).toHaveValue(searchText);

    // Wait for search to complete
    await page.locator('text=1/2').waitFor();

    // Workaround selection not showing up initially (bug!)
    await page.getByRole('button', { name: 'Next Match (Ctrl+G)' }).click();
    await page.locator('.jp-current-match').first().waitFor();

    // Take a screenshot to verify the search results
    const screenshot = await page.getByLabel('untitled.txt').screenshot();
    expect(screenshot).toMatchSnapshot('search-results.png');
  });

  test('should expand the selection to all occurrences', async ({ page }) => {
    // This could be improved as the following statement will double click
    // on the last line that will result in the last word being selected.
    await page.getByRole('textbox').getByText('in').last().dblclick();

    await page.keyboard.press('Control+Shift+l');

    // Switch back to notebook
    // FIXME it should not be needed when we get https://github.com/jupyterlab/lumino/pull/662
    await page.activity.activateTab(DEFAULT_NAME);

    await expect(
      page.getByRole('main').locator('.cm-selectionBackground')
    ).toHaveCount(7);
  });
});
