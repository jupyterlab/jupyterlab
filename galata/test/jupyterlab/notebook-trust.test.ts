// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IJupyterLabPageFixture } from '@jupyterlab/galata';
import { expect, galata, test } from '@jupyterlab/galata';

const fileName = 'trust.ipynb';
const TRUSTED_SELECTOR = 'svg[data-icon="ui-components:trusted"]';
const NOT_TRUSTED_SELECTOR = 'svg[data-icon="ui-components:not-trusted"]';
const PAGER_SCRIPT_MARKER_CLASS = 'jp-pager-script-marker';
const PAGER_FALLBACK_MARKER_CLASS = 'jp-pager-fallback-marker';
const PAGER_SCRIPT_MARKER_SELECTOR = `.${PAGER_SCRIPT_MARKER_CLASS}`;
const PAGER_FALLBACK_MARKER_SELECTOR = `.${PAGER_FALLBACK_MARKER_CLASS}`;

type PagerWindow = Window & { __jpPagerScriptExecuted?: boolean };

async function runPagerPayload(
  page: IJupyterLabPageFixture,
  html: string,
  text = 'Pager plain text'
): Promise<void> {
  const source = [
    'from IPython import get_ipython',
    '',
    'get_ipython().payload_manager.write_payload({',
    '    "source": "page",',
    '    "data": {',
    `        "text/html": ${JSON.stringify(html)},`,
    `        "text/plain": ${JSON.stringify(text)}`,
    '    },',
    '    "metadata": {}',
    '})'
  ].join('\n');

  await page.notebook.setCell(0, 'code', source);
  await page.notebook.runCell(0, true);
}

async function pagerScriptExecuted(
  page: IJupyterLabPageFixture
): Promise<boolean> {
  return page.evaluate(() => {
    return Boolean((window as PagerWindow).__jpPagerScriptExecuted);
  });
}

test.describe('Notebook Trust', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(fileName);
  });

  test('Blank Markdown cell does not break trust', async ({ page }) => {
    // See https://github.com/jupyterlab/jupyterlab/issues/9765

    // Add an empty Markdown cell
    await page.notebook.addCell('markdown', '');
    // The notebook should be trusted
    await expect(page.locator(TRUSTED_SELECTOR)).toHaveCount(1);
    await page.notebook.save();
    // Reload page
    await page.reload({ waitForIsReady: false });
    // Should still be trusted
    await expect(page.locator(TRUSTED_SELECTOR)).toHaveCount(1);
  });

  test('Trust is lost after manually editing notebook', async ({
    page,
    browserName
  }) => {
    const browserContext = page.context();
    if (browserName !== 'firefox') {
      // Firefox does not support clipboard-read but does not it it either
      await browserContext.grantPermissions(['clipboard-read']);
    }
    // Add text to first cell
    await page.notebook.setCell(0, 'code', 'TEST_TEXT');
    await page.notebook.save();
    // The notebook should be trusted
    await expect(page.locator(TRUSTED_SELECTOR)).toHaveCount(1);
    await expect(page.locator(NOT_TRUSTED_SELECTOR)).toHaveCount(0);

    // Open notebook in text editor using context menu
    await page.click(`.jp-DirListing-item span:has-text("${fileName}")`, {
      button: 'right'
    });
    await page.hover('text=Open With');
    await page.click('.lm-Menu li[role="menuitem"]:has-text("Editor")');
    const editorContent = page.locator('.jp-FileEditor .cm-content');
    await editorContent.waitFor();
    await editorContent.locator('text=TEST_TEXT').waitFor();
    const originalContent = await page.evaluate(async () => {
      await window.jupyterapp.commands.execute('fileeditor:select-all');
      await window.jupyterapp.commands.execute('fileeditor:cut');
      return navigator.clipboard.readText();
    });
    const newContent = originalContent.replace('TEST_TEXT', 'SUBSTITUTED_TEXT');
    await page.evaluate(
      async ([newContent]) => {
        await window.jupyterapp.commands.execute(
          'fileeditor:replace-selection',
          { text: newContent }
        );
        // Save file after changes
        await window.jupyterapp.commands.execute('docmanager:save');
        // Close the file editor view of the notebook
        await window.jupyterapp.commands.execute('application:close');
      },
      [newContent]
    );

    // Reload page
    await page.reload({ waitForIsReady: false });

    // It should no longer be trusted
    await expect(page.locator(TRUSTED_SELECTOR)).toHaveCount(0);
    await expect(page.locator(NOT_TRUSTED_SELECTOR)).toHaveCount(1);
  });

  test('Pager payload renders as cell output by default', async ({ page }) => {
    await runPagerPayload(
      page,
      [
        `<div class="${PAGER_FALLBACK_MARKER_CLASS}">`,
        '<strong>Pager fallback HTML</strong>',
        '</div>'
      ].join('')
    );

    await expect(page.locator(PAGER_FALLBACK_MARKER_SELECTOR)).toContainText(
      'Pager fallback HTML'
    );
    await expect(page.locator('.jp-HelpPanel')).toHaveCount(0);
  });

  test.describe('Bottom panel pager', () => {
    test.use({
      mockSettings: {
        ...galata.DEFAULT_SETTINGS,
        '@jupyterlab/notebook-extension:tracker': {
          ...galata.DEFAULT_SETTINGS['@jupyterlab/notebook-extension:tracker'],
          helpInBottomPanel: true
        }
      }
    });

    test('Pager HTML is sanitized before rendering', async ({ page }) => {
      await page.evaluate(() => {
        delete (window as PagerWindow).__jpPagerScriptExecuted;
      });

      await runPagerPayload(
        page,
        [
          `<div class="${PAGER_SCRIPT_MARKER_CLASS}">`,
          '<strong>Pager panel HTML</strong>',
          '<script>window.__jpPagerScriptExecuted = true;</script>',
          '</div>'
        ].join('')
      );

      const helpPanel = page.locator('.jp-HelpPanel');
      await expect(
        helpPanel.locator(PAGER_SCRIPT_MARKER_SELECTOR)
      ).toContainText('Pager panel HTML');
      await expect(helpPanel.locator('script')).toHaveCount(0);
      expect(await pagerScriptExecuted(page)).toBe(false);
    });
  });
});
