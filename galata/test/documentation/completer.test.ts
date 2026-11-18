// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IJupyterLabPageFixture } from '@jupyterlab/galata';
import { expect, galata, test } from '@jupyterlab/galata';
import type { Locator } from '@playwright/test';
import path from 'path';
import type { IClip } from './utils';
import { boundsAround } from './utils';

const COMPLETER_SELECTOR = '.jp-Completer';
const INLINE_COMPLETER_SELECTOR = '.jp-InlineCompleter';
const GHOST_SELECTOR = '.jp-GhostText';
const MANAGER_ID = '@jupyterlab/completer-extension:manager';
const INLINE_COMPLETER_ID = '@jupyterlab/completer-extension:inline-completer';
const HISTORY_PROVIDER_ID = '@jupyterlab/inline-completer:history';

// Least width of the region screenshotted around a completer popup; stays well
// clear of the cell toolbar on the right-hand side of the cell.
const MIN_POPUP_REGION_WIDTH = 420;

// Size of the region screenshotted around a highlighted setting.
const SETTING_MARGIN = 16;
const SETTING_HEIGHT = 340;

// The completer is performance critical; it must show up quickly, otherwise
// the test should fail rather than wait for the test-wide timeout to lapse.
const COMPLETER_TIMEOUT = 15000;

// The kernels of the tests running in parallel compete for the resources of
// the machine, so the providers are given more time than their default to
// answer, otherwise their suggestions get discarded.
const PROVIDER_TIMEOUT = 60000;

// Fixtures of the functional test suite, reused here rather than duplicated.
const NOTEBOOKS = path.resolve(__dirname, '../jupyterlab/notebooks');
const MODULE = 'completer_panel.py';
const INLINE_NOTEBOOK = 'inline_completer.ipynb';
// Cell of `inline_completer.ipynb` in which the prefix gets typed.
const PROMPT_CELL = 2;

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  viewport: { height: 720, width: 1280 }
});

test.describe('Code completer', () => {
  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      [MANAGER_ID]: {
        providerTimeout: PROVIDER_TIMEOUT
      }
    }
  });

  test('Completer widget', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);
    const completer = await invokeCompleter(page, tmpPath);

    expect(
      await page.screenshot({
        clip: await boundsAroundPopups(
          page,
          (await page.notebook.getCellLocator(1))!,
          [completer]
        )
      })
    ).toMatchSnapshot('completer_widget.png');
  });

  test.describe('With documentation panel', () => {
    test.use({
      mockSettings: {
        ...galata.DEFAULT_SETTINGS,
        [MANAGER_ID]: {
          providerTimeout: PROVIDER_TIMEOUT,
          showDocumentationPanel: true
        }
      }
    });

    test('Documentation panel', async ({ page, tmpPath }) => {
      await page.goto(`tree/${tmpPath}`);
      const completer = await invokeCompleter(page, tmpPath);

      // The documentation is fetched asynchronously with an `inspect_request`.
      await completer
        .locator('.jp-Completer-docpanel')
        .getByText('Documentation of 1st option.')
        .waitFor({ timeout: COMPLETER_TIMEOUT });
      await completer
        .locator('.jp-Completer-loading-bar')
        .waitFor({ state: 'detached' });

      expect(
        await page.screenshot({
          clip: await boundsAroundPopups(
            page,
            (await page.notebook.getCellLocator(1))!,
            [completer]
          )
        })
      ).toMatchSnapshot('completer_documentation_panel.png');
    });
  });
});

test.describe('Inline completer', () => {
  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      [INLINE_COMPLETER_ID]: {
        showWidget: 'onHover',
        showShortcuts: true,
        providers: {
          '@jupyterlab/inline-completer:history': {
            enabled: true,
            timeout: PROVIDER_TIMEOUT
          }
        }
      }
    }
  });

  test('Ghost text and widget', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);
    const ghostText = await invokeInlineCompleter(page, tmpPath);
    const cell = (await page.notebook.getCellLocator(PROMPT_CELL))!;

    expect
      .soft(
        await page.screenshot({
          clip: await boundsAroundPopups(page, cell, [ghostText])
        })
      )
      .toMatchSnapshot('inline_completer_ghost_text.png');

    await ghostText.hover();

    const completer = page.locator(INLINE_COMPLETER_SELECTOR);
    await completer.waitFor();
    // Wait for the widget to reach full opacity.
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(100);

    expect(
      await page.screenshot({
        clip: await boundsAroundPopups(page, cell, [ghostText, completer])
      })
    ).toMatchSnapshot('inline_completer_widget.png');

    // Should hide on moving the cursor away.
    await (await page.notebook.getToolbarLocator())!.hover();
    await completer.waitFor({ state: 'hidden' });
  });
});

test.describe('Settings', () => {
  // Taller viewport so that the region below the highlighted setting is filled.
  test.use({ viewport: { height: 900, width: 1280 } });

  test('Code Completion', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);
    const section = await openSettings(page, 'Code Completion');

    expect(
      await screenshotSetting(page, section, {
        highlight: `${MANAGER_ID}_autoCompletion`
      })
    ).toMatchSnapshot('completer_settings.png');
  });

  test.describe('Inline completer', () => {
    test.use({
      mockSettings: {
        ...galata.DEFAULT_SETTINGS,
        [INLINE_COMPLETER_ID]: {
          providers: {
            '@jupyterlab/inline-completer:history': {
              enabled: true
            }
          }
        }
      }
    });

    test('Inline Completer', async ({ page, tmpPath }) => {
      await page.goto(`tree/${tmpPath}`);
      const section = await openSettings(page, 'Inline Completer');

      expect(
        await screenshotSetting(page, section, {
          highlight: `${INLINE_COMPLETER_ID}_providers_${HISTORY_PROVIDER_ID}_enabled`,
          from: `${INLINE_COMPLETER_ID}_providers_${HISTORY_PROVIDER_ID}`
        })
      ).toMatchSnapshot('inline_completer_settings.png');
    });
  });
});

/**
 * Import the module documenting its functions in a new notebook, then open the
 * code completer on a prefix shared by those functions.
 */
async function invokeCompleter(
  page: IJupyterLabPageFixture,
  tmpPath: string
): Promise<Locator> {
  await page.contents.uploadFile(
    path.resolve(NOTEBOOKS, MODULE),
    `${tmpPath}/${MODULE}`
  );

  await page.notebook.createNew();
  await page.sidebar.setWidth();
  await page.locator('text=Python 3 (ipykernel) | Idle').waitFor();

  await page.notebook.setCell(
    0,
    'code',
    'from completer_panel import option_1, option_2'
  );
  await page.notebook.runCell(0, true);
  await page.notebook.addCell('code', 'option');
  await page.notebook.enterCellEditingMode(1);

  // The completer is bound to the cell only after entering it.
  const editor = page.locator(
    '.lm-Widget.jp-mod-active .jp-CodeMirrorEditor.jp-InputArea-editor'
  );
  await expect(editor).toHaveClass(/jp-mod-completer-enabled/);

  // The first invocation can happen before the kernel replied, leaving the
  // candidates without their type; invoking it again gives the complete list.
  const completer = page.locator(COMPLETER_SELECTOR);
  await page.keyboard.press('Tab');
  await completer.waitFor({ timeout: COMPLETER_TIMEOUT });
  await page.keyboard.press('Escape');
  await expect(completer).toBeHidden();

  await expect(editor).toHaveClass(/jp-mod-completer-enabled/);
  await page.keyboard.press('Tab');
  await completer.waitFor({ timeout: COMPLETER_TIMEOUT });

  // Guard against screenshotting a list which is still being completed.
  await expect(completer.locator('.jp-Completer-item')).toHaveText([
    /option_1.*function/,
    /option_2.*function/
  ]);

  return completer;
}

/**
 * Open the notebook of the inline completer tests and type the character which
 * makes the history provider suggest a previously executed line as ghost text.
 */
async function invokeInlineCompleter(
  page: IJupyterLabPageFixture,
  tmpPath: string
): Promise<Locator> {
  await page.contents.uploadFile(
    path.resolve(NOTEBOOKS, INLINE_NOTEBOOK),
    `${tmpPath}/${INLINE_NOTEBOOK}`
  );
  await page.notebook.openByPath(`${tmpPath}/${INLINE_NOTEBOOK}`);
  await page.notebook.activate(INLINE_NOTEBOOK);
  await page.sidebar.setWidth();

  await page.notebook.runCell(0, true);
  await page.notebook.runCell(1, true);
  await page.notebook.enterCellEditingMode(PROMPT_CELL);
  // We need to wait until the completer gets bound to the cell after entering it.
  // eslint-disable-next-line playwright/no-wait-for-timeout
  await page.waitForTimeout(50);

  await page.keyboard.press('u');

  const ghostText = page.locator(GHOST_SELECTOR);
  await ghostText.waitFor({ timeout: COMPLETER_TIMEOUT });

  return ghostText;
}

/**
 * Region covering the given popups and the cell they belong to.
 *
 * The right-hand side of a cell only holds the cell toolbar, which is not part
 * of what these screenshots document, so the region stops at the popups.
 *
 * @param page The page the elements belong to
 * @param cell The cell the popups are anchored to
 * @param popups The popups to cover
 */
async function boundsAroundPopups(
  page: IJupyterLabPageFixture,
  cell: Locator,
  popups: Locator[]
): Promise<IClip> {
  const region = await boundsAround(page, [cell, ...popups]);
  const popup = await boundsAround(page, popups);
  return {
    ...region,
    // Narrow popups would give a screenshot too small to read comfortably.
    width: Math.max(popup.x + popup.width - region.x, MIN_POPUP_REGION_WIDTH)
  };
}

/**
 * Point the reader at a setting and take a screenshot of the region of a fixed
 * height which starts at it.
 *
 * The region is anchored on the setting rather than covering the whole
 * section, so that the screenshot does not have to be updated every time an
 * unrelated setting is added to the section.
 *
 * @param page The page the Settings Editor is opened in
 * @param section The settings section the setting belongs to
 * @param options Identifier of the setting to point at (`highlight`) and,
 * optionally, of the group the region starts at (`from`), which defaults to
 * the highlighted setting itself
 */
async function screenshotSetting(
  page: IJupyterLabPageFixture,
  section: Locator,
  options: { highlight: string; from?: string }
): Promise<Buffer> {
  // A setting is nested in the group of its section and, for the settings of a
  // provider, in the group of that provider; the innermost one is the field.
  const group = (id: string) =>
    section
      .locator('.form-group, fieldset')
      .filter({ has: page.locator(`[id="jp-SettingsEditor-${id}"]`) })
      .last();

  const highlighted = group(options.highlight);
  const anchor = options.from ? group(options.from) : highlighted;
  await anchor.evaluate(node => node.scrollIntoView({ block: 'center' }));

  await page.addStyleTag({
    content: `.jp-mod-documentation-highlight {
      outline: 2px solid #ff0000;
      outline-offset: 2px;
    }`
  });
  await highlighted.evaluate(node =>
    node.classList.add('jp-mod-documentation-highlight')
  );

  const sectionBox = (await section.boundingBox())!;
  const anchorBox = (await anchor.boundingBox())!;
  const viewport = page.viewportSize()!;

  const top = Math.max(
    0,
    Math.min(anchorBox.y - SETTING_MARGIN, viewport.height - SETTING_HEIGHT)
  );
  return page.screenshot({
    clip: {
      x: sectionBox.x,
      y: top,
      width: sectionBox.width,
      // Stop at the end of the section rather than filling the region with the
      // background of the panel.
      height: Math.min(
        SETTING_HEIGHT,
        sectionBox.y + sectionBox.height - top,
        viewport.height - top
      )
    }
  });
}

/**
 * Open the Settings Editor on the section with the given name.
 */
async function openSettings(
  page: IJupyterLabPageFixture,
  name: string
): Promise<Locator> {
  await page.evaluate(async query => {
    await window.jupyterapp.commands.execute('settingeditor:open', { query });
  }, name);

  await page.locator('.jp-SettingsPanel').waitFor();
  await page.sidebar.setWidth();

  // Selecting the plugin hides the settings of the other plugins matching
  // the query.
  await page
    .locator('.jp-PluginList-entry-label-text')
    .filter({ hasText: name })
    .click();

  const section = page.locator('.jp-SettingsForm');
  await expect(section).toHaveCount(1);

  return section;
}
