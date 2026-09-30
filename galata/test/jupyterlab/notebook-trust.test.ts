// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IJupyterLabPageFixture } from '@jupyterlab/galata';
import { expect, galata, test } from '@jupyterlab/galata';

const fileName = 'trust.ipynb';
const commandLinkFileName = 'trust-command-link.ipynb';
const COMMAND_ID = 'galata:notebook-command-link-trust';
const BUTTON_TEXT = 'Run notebook linked command';
const TRUSTED_SELECTOR = 'svg[data-icon="ui-components:trusted"]';
const NOT_TRUSTED_SELECTOR = 'svg[data-icon="ui-components:not-trusted"]';
const PAGER_SCRIPT_MARKER_CLASS = 'jp-pager-script-marker';
const PAGER_FALLBACK_MARKER_CLASS = 'jp-pager-fallback-marker';

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

const commandLinkNotebook = {
  cells: [
    {
      cell_type: 'code',
      execution_count: 1,
      id: 'command-link-cell',
      metadata: { trusted: false },
      outputs: [
        {
          data: {
            'text/html': `<button data-commandlinker-command="${COMMAND_ID}" type="button">${BUTTON_TEXT}</button>`,
            'text/plain': BUTTON_TEXT
          },
          metadata: {},
          output_type: 'display_data'
        }
      ],
      source: []
    }
  ],
  metadata: {
    kernelspec: {
      display_name: 'Python 3',
      language: 'python',
      name: 'python3'
    },
    language_info: {
      name: 'python'
    }
  },
  nbformat: 4,
  nbformat_minor: 5
};

async function registerCommand(page: IJupyterLabPageFixture): Promise<void> {
  await page.evaluate(command => {
    const testWindow = window as Window & {
      __notebookCommandLinkTrustRuns?: number;
    };
    testWindow.__notebookCommandLinkTrustRuns = 0;
    if (!window.jupyterapp.commands.hasCommand(command)) {
      window.jupyterapp.commands.addCommand(command, {
        label: 'Galata Notebook Command Link Trust',
        execute: () => {
          testWindow.__notebookCommandLinkTrustRuns =
            (testWindow.__notebookCommandLinkTrustRuns ?? 0) + 1;
        }
      });
    }
  }, COMMAND_ID);
}

async function commandRunCount(page: IJupyterLabPageFixture): Promise<number> {
  return page.evaluate(() => {
    const testWindow = window as Window & {
      __notebookCommandLinkTrustRuns?: number;
    };
    return testWindow.__notebookCommandLinkTrustRuns ?? 0;
  });
}

test.describe('Notebook Trust', () => {
  test('Blank Markdown cell does not break trust', async ({ page }) => {
    // See https://github.com/jupyterlab/jupyterlab/issues/9765

    await page.notebook.createNew(fileName);
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

    await page.notebook.createNew(fileName);
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

  test('runs a trusted command link after trusting notebook output', async ({
    page,
    tmpPath
  }) => {
    const notebookContent = JSON.stringify({
      ...commandLinkNotebook,
      metadata: {
        ...commandLinkNotebook.metadata,
        // Keep the notebook unsigned even when the test is rerun after trusting it.
        commandLinkTrustNonce: Date.now()
      }
    });

    await page.contents.uploadContent(
      notebookContent,
      'text',
      `${tmpPath}/${commandLinkFileName}`
    );
    expect(
      await page.notebook.openByPath(`${tmpPath}/${commandLinkFileName}`)
    ).toBe(true);
    await registerCommand(page);

    const commandLink = page.getByRole('button', { name: BUTTON_TEXT });
    await expect(commandLink).toBeVisible();
    await commandLink.click();

    const dialog = page.locator('.jp-Dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Trust' }).click();

    const trustNotebookDialog = page.locator('.jp-Dialog');
    await expect(trustNotebookDialog).toBeVisible();
    await trustNotebookDialog
      .getByRole('button', { name: 'Confirm Trusting this notebook' })
      .click();

    await expect.poll(() => commandRunCount(page)).toBe(1);
    await expect(page.locator(TRUSTED_SELECTOR)).toHaveCount(1);
  });

  test('Pager payload renders as cell output by default', async ({ page }) => {
    await page.notebook.createNew(fileName);

    await runPagerPayload(
      page,
      [
        `<div class="${PAGER_FALLBACK_MARKER_CLASS}">`,
        '<strong>Pager fallback HTML</strong>',
        '</div>'
      ].join('')
    );

    await expect(page.locator(`.${PAGER_FALLBACK_MARKER_CLASS}`)).toContainText(
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
      await page.notebook.createNew(fileName);

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
        helpPanel.locator(`.${PAGER_SCRIPT_MARKER_CLASS}`)
      ).toContainText('Pager panel HTML');
      await expect(helpPanel.locator('script')).toHaveCount(0);
      expect(await pagerScriptExecuted(page)).toBe(false);
    });
  });
});
