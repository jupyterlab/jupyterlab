// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IJupyterLabPageFixture } from '@jupyterlab/galata';
import { expect, galata, test } from '@jupyterlab/galata';

// The `showLockForReadOnlyCells` default is false, which would hide the lock
// button in every state; the tests need to observe that state changing.
test.use({
  mockSettings: {
    ...galata.DEFAULT_SETTINGS,
    '@jupyterlab/notebook-extension:tracker': {
      showLockForReadOnlyCells: true
    }
  }
});

/**
 * The command buttons rendered in the cell toolbar (the small bar that
 * hovers over the active cell), identified by their `data-command` attribute,
 * set in `propsFromCommand` (see
 * packages/ui-components/src/components/toolbar.tsx).
 */
const DELETE_BUTTON = '.jp-cell-toolbar [data-command="cell-toolbar:delete"]';
const LOCK_COMMAND = 'notebook:make-cell-editable';
const LOCK_BUTTON = `.jp-cell-toolbar [data-command="${LOCK_COMMAND}"]`;
const UNLOCK_LABEL = 'Make Editable';

/**
 * These buttons are `jp-button` (FAST) web components: the native `disabled`
 * lives in their shadow root, and Playwright `toBeDisabled()` does not report
 * custom elements as disabled even when the host has the attribute.
 * `aria-disabled` is set explicitly by the toolbar component, so it is the
 * deterministic signal to observe.
 */
async function expectButtonState(
  page: IJupyterLabPageFixture,
  selector: string,
  disabled: boolean
): Promise<void> {
  const button = page.locator(selector);
  await expect(button).toHaveCount(1);
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute('aria-disabled', String(disabled));
}

/**
 * Set metadata on the active cell. `CellModel.setMetadata` writes to the
 * shared model, which emits `metadataChanged`; the command is re-notified,
 * and its `isEnabled`/`isVisible` is re-evaluated.
 */
async function setCellMetadata(
  page: IJupyterLabPageFixture,
  key: string,
  value: unknown
): Promise<void> {
  await page.evaluate(
    ([k, v]) => {
      const panel = window.jupyterapp.shell.currentWidget;
      panel.content.activeCell?.model.setMetadata(k, v);
    },
    [key, value] as const
  );
}

/**
 * Get a metadata value of the active cell.
 */
async function getCellMetadata(
  page: IJupyterLabPageFixture,
  key: string
): Promise<unknown> {
  return page.evaluate(k => {
    const panel = window.jupyterapp.shell.currentWidget;
    return panel.content.activeCell?.model.getMetadata(k);
  }, key);
}

/**
 * Count the `notebook:delete-cell` notifications sent while a metadata value
 * of the cell at `index` is set.
 */
async function countDeleteNotifications(
  page: IJupyterLabPageFixture,
  index: number,
  key: string,
  value: unknown
): Promise<number> {
  return page.evaluate(
    ([i, k, v]) => {
      const { commands, shell } = window.jupyterapp;
      let count = 0;
      const onChanged = (_: unknown, change: { id?: string }) => {
        if (change.id === 'notebook:delete-cell') {
          count++;
        }
      };
      commands.commandChanged.connect(onChanged);
      shell.currentWidget.content.widgets[i].model.setMetadata(k, v);
      commands.commandChanged.disconnect(onChanged);
      return count;
    },
    [index, key, value] as const
  );
}

/**
 * Whether the lock command is enabled.
 */
async function isLockEnabled(page: IJupyterLabPageFixture): Promise<boolean> {
  return page.evaluate(
    id => window.jupyterapp.commands.isEnabled(id),
    LOCK_COMMAND
  );
}

/**
 * Turn the lock icon setting on or off.
 */
async function setLockSetting(
  page: IJupyterLabPageFixture,
  value: boolean
): Promise<void> {
  await page.evaluate(async v => {
    const registry = await window.galata.getPlugin(
      '@jupyterlab/apputils-extension:settings'
    );
    await registry?.set(
      '@jupyterlab/notebook-extension:tracker',
      'showLockForReadOnlyCells',
      v
    );
  }, value);
}

/**
 * Delete a metadata key from the active cell. That is exactly what the
 * Common Tools form does when the selected value equals the schema default:
 * the writer in packages/metadataform/src/metadataform.ts drops the key
 * instead of writing the default value.
 */
async function deleteCellMetadata(
  page: IJupyterLabPageFixture,
  key: string
): Promise<void> {
  await page.evaluate(k => {
    const panel = window.jupyterapp.shell.currentWidget;
    panel.content.activeCell?.model.deleteMetadata(k);
  }, key);
}

test.describe('Cell toolbar command icons react to cell metadata', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew();
  });

  test('delete button greys out when the active cell is not deletable', async ({
    page
  }) => {
    await expectButtonState(page, DELETE_BUTTON, false);

    await setCellMetadata(page, 'deletable', false);
    await expectButtonState(page, DELETE_BUTTON, true);

    await setCellMetadata(page, 'deletable', true);
    await expectButtonState(page, DELETE_BUTTON, false);
  });

  test('lock icon follows the editable metadata, including the form path', async ({
    page
  }) => {
    const lock = page.locator(LOCK_BUTTON);
    // The button is in the DOM even while hidden, so wait for `attached`.
    await lock.waitFor({ state: 'attached' });
    await expect(lock).toHaveCount(1);

    // No `editable` metadata means the cell is editable: no lock.
    // Before the fix, `getMetadata('editable') !== true` was true for the
    // absent key, so the lock was shown on every cell.
    await expect(lock).toBeHidden();

    // Read-only: explicitly `editable: false` (what selecting "Read-Only"
    // writes, and what Advanced Tools writes).
    await setCellMetadata(page, 'editable', false);
    await expect(lock).toBeVisible();
    const icon = lock.locator('[data-icon="ui-components:lock"]');
    await expect(icon).toHaveCount(1);

    // Reverting to "Editable" in Common Tools deletes the key because the
    // value equals the schema default; the lock must go away.
    await deleteCellMetadata(page, 'editable');
    await expect(lock).toBeHidden();
  });

  test('a change of the active cell notifies the delete command once', async ({
    page
  }) => {
    await page.notebook.addCell('code', 'b = 2');
    await page.evaluate(() => {
      const notebook = window.jupyterapp.shell.currentWidget.content;
      for (let i = 0; i < 5; i++) {
        notebook.activeCellIndex = 0;
        notebook.activeCellIndex = 1;
      }
    });
    expect(await countDeleteNotifications(page, 1, 'deletable', false)).toBe(1);
  });

  test('a change of another metadata key does not notify the delete command', async ({
    page
  }) => {
    expect(await countDeleteNotifications(page, 0, 'tags', ['answer'])).toBe(0);
  });

  test('a change of a cell that is no longer active does not notify the delete command', async ({
    page
  }) => {
    await page.notebook.addCell('code', 'b = 2');
    expect(await countDeleteNotifications(page, 0, 'deletable', false)).toBe(0);
  });

  test('turning the setting off hides the lock', async ({ page }) => {
    await setCellMetadata(page, 'editable', false);
    const lock = page.locator(LOCK_BUTTON);
    await expect(lock).toBeVisible();

    await setLockSetting(page, false);
    await expect(lock).toBeHidden();
  });

  test('the unlock button makes the cell editable', async ({ page }) => {
    await setCellMetadata(page, 'editable', false);
    const lock = page.locator(LOCK_BUTTON);
    await lock.click();
    await page
      .locator('.jp-Dialog')
      .getByRole('button', { name: UNLOCK_LABEL })
      .click();

    await expect(lock).toBeHidden();
    expect(await getCellMetadata(page, 'editable')).toBeUndefined();
  });

  test('Enter in the lock dialog keeps the cell read-only', async ({
    page
  }) => {
    await setCellMetadata(page, 'editable', false);
    await page.locator(LOCK_BUTTON).click();
    const dialog = page.locator('.jp-Dialog');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(dialog).toHaveCount(0);
    expect(await getCellMetadata(page, 'editable')).toBe(false);
  });

  test('the lock command is disabled for an editable cell', async ({
    page
  }) => {
    expect(await isLockEnabled(page)).toBe(false);
  });

  test('the lock command is disabled in a view-only notebook', async ({
    page
  }) => {
    await setCellMetadata(page, 'editable', false);
    await page.evaluate(() => {
      window.jupyterapp.shell.currentWidget.context.model.readOnly = true;
    });
    expect(await isLockEnabled(page)).toBe(false);
  });

  test('the setting hides the lock only in toolbars', async ({ page }) => {
    await setCellMetadata(page, 'editable', false);
    await setLockSetting(page, false);

    const visible = await page.evaluate(id => {
      const { commands } = window.jupyterapp;
      return {
        toolbar: commands.isVisible(id, { toolbar: true }),
        elsewhere: commands.isVisible(id)
      };
    }, LOCK_COMMAND);
    expect(visible).toEqual({ toolbar: false, elsewhere: true });
  });
});

test.describe('Delete button in the notebook toolbar', () => {
  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/notebook-extension:panel': {
        toolbar: [
          {
            name: 'delete-cell',
            command: 'notebook:delete-cell',
            icon: 'ui-components:delete',
            rank: 25
          }
        ]
      }
    }
  });

  test('follows the active cell', async ({ page }) => {
    const button =
      '.jp-NotebookPanel-toolbar [data-command="notebook:delete-cell"]';
    await page.notebook.createNew();
    await page.notebook.addCell('code', 'b = 2');
    await setCellMetadata(page, 'deletable', false);

    await page.notebook.selectCells(0);
    await expectButtonState(page, button, false);

    await page.notebook.selectCells(1);
    await expectButtonState(page, button, true);
  });
});
