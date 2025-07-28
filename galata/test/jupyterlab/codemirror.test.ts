// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import { Page } from '@playwright/test';

const DEFAULT_NAME = 'untitled.txt';

const RULERS_CONTENT = `0123456789
          0123456789
                    0123456789
                              0123456789
                                        0123456789
                                                  0123456789
0123456789
          0123456789
                    0123456789
                              0123456789
                                        0123456789
                                                  0123456789`;

test.describe('CodeMirror extensions', () => {
  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/codemirror-extension:plugin': {
        defaultConfig: {
          rulers: [10, 20, 30, 40, 50, 60]
        }
      }
    }
  });

  test('Should display rulers', async ({ page }) => {
    await page.menu.clickMenuItem('File>New>Text File');

    await page.getByRole('tab', { name: DEFAULT_NAME }).waitFor();

    const editor = page.getByRole('region', { name: 'main area content' });
    await editor.getByRole('textbox').fill(RULERS_CONTENT);

    expect(await editor.screenshot()).toMatchSnapshot('codemirror-rulers.png');
  });
});

test.describe('Code Folding Menu', () => {
  const nestedCode = `
class Test:
  def __init__(self):
    self.data = []

  def test_data(self):
    for i in range(5):
      if i % 2 == 0:
        for j in range(3):
          if j > 0:
            self.data.append(i * j)
          else:
            self.data.append(0)
      else:
        try:
          result = i ** 2
          self.data.append(result)
        except Exception as e:
          print(f"Error: {e}")
    return self.data

class Test_2:
  def __init__(self):
    self.data = 1

obj = Test()
`.trim();

  async function selectKernelIfDialog(page: Page) {
    const dialogButton = page.locator(
      '.jp-Dialog-buttonLabel:has-text("Select")'
    );
    await dialogButton.click({ timeout: 20000 });
  }

  test('Should fold and unfold current region', async ({ page }) => {
    // Create a new notebook
    await page.menu.clickMenuItem('File>New>Notebook');
    await page.getByRole('tab', { name: /Untitled.*/ }).waitFor();
    await selectKernelIfDialog(page);

    await page.notebook.setCell(0, 'code', nestedCode);
    await page.notebook.enterCellEditingMode(0);

    const cellEditor = (await page.notebook.getCellLocator(0))!;
    const initialLineCount = await cellEditor.locator('.cm-line').count();

    // Position cursor at end of a foldable region (inner for loop)
    await page.keyboard.press('Control+Home');
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press('ArrowDown');
    }
    await page.keyboard.press('End');

    // Trigger folding current region
    await page.menu.clickMenuItem('View>Code fold>Fold Current Region');

    // Verify exactly one unfold span appears
    await cellEditor
      .locator('span[title="unfold"]')
      .waitFor({ state: 'visible', timeout: 5000 });
    const unfoldCount = await cellEditor
      .locator('span[title="unfold"]')
      .count();
    expect(unfoldCount).toBe(1);

    // Verify that there are still multiple lines
    const currentLineCount = await cellEditor.locator('.cm-line').count();
    expect(currentLineCount).toBeGreaterThan(1);
    expect(currentLineCount).toBeLessThan(initialLineCount);

    // Unfold current region
    await page.menu.clickMenuItem('View>Code fold>Unfold Current Region');
    await cellEditor
      .locator('span[title="unfold"]')
      .waitFor({ state: 'detached', timeout: 5000 });
    const unfoldCountAfter = await cellEditor
      .locator('span[title="unfold"]')
      .count();
    expect(unfoldCountAfter).toBe(0);
    const finalLineCount = await cellEditor.locator('.cm-line').count();
    expect(finalLineCount).toBe(initialLineCount);
  });

  test('Should fold and unfold all subregions', async ({ page }) => {
    await page.menu.clickMenuItem('File>New>Notebook');
    await page.getByRole('tab', { name: /Untitled.*/ }).waitFor();
    await selectKernelIfDialog(page);

    await page.notebook.setCell(0, 'code', nestedCode);
    await page.notebook.enterCellEditingMode(0);

    const cellEditor = (await page.notebook.getCellLocator(0))!;

    // Position cursor at top of main foldable region (inner for loop)
    await page.keyboard.press('Control+Home');
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowDown');
    }

    // Trigger folding all subregions
    await page.menu.clickMenuItem('View>Code fold>Fold All Subregions');

    await cellEditor
      .locator('span[title="unfold"]')
      .first()
      .waitFor({ state: 'visible', timeout: 5000 });

    // Count unfold spans - 2 (if and else block)
    const unfoldCount = await cellEditor
      .locator('span[title="unfold"]')
      .count();
    expect(unfoldCount).toBe(2);

    // Unfold all subregions
    await page.menu.clickMenuItem('View>Code fold>Unfold All Subregions');
    const unfoldCountAfter = await cellEditor
      .locator('span[title="unfold"]')
      .count();
    expect(unfoldCountAfter).toBe(0);
  });

  test('Should fold and unfold all Regions', async ({ page }) => {
    await page.menu.clickMenuItem('File>New>Notebook');
    await page.getByRole('tab', { name: /Untitled.*/ }).waitFor();
    await selectKernelIfDialog(page);

    await page.notebook.setCell(0, 'code', nestedCode);
    await page.notebook.enterCellEditingMode(0);

    const cellEditor = (await page.notebook.getCellLocator(0))!;
    const initialLineCount = await cellEditor.locator('.cm-line').count();

    await page.keyboard.press('Control+Home');

    // Trigger folding all regions
    await page.menu.clickMenuItem('View>Code fold>Fold All Regions');

    await cellEditor
      .locator('span[title="unfold"]')
      .first()
      .waitFor({ state: 'visible', timeout: 5000 });

    // Verify only one line is visible (the entire code is folded to one line)
    const visibleLineCount = await cellEditor.locator('.cm-line').count();
    expect(visibleLineCount).toBe(5);

    const unfoldCount = await cellEditor
      .locator('span[title="unfold"]')
      .count();
    expect(unfoldCount).toBe(2);

    // Unfold all
    await page.menu.clickMenuItem('View>Code fold>Unfold All Regions');
    const unfoldCountAfter = await cellEditor
      .locator('span[title="unfold"]')
      .count();
    expect(unfoldCountAfter).toBe(0);
    const finalLineCount = await cellEditor.locator('.cm-line').count();
    expect(finalLineCount).toBe(initialLineCount);
  });
});
