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
const LOCK_BUTTON =
  '.jp-cell-toolbar [data-command="notebook:make-cell-editable"]';

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

    // Reverting to "Editable" in Common Tools deletes the key because the
    // value equals the schema default; the lock must go away.
    await deleteCellMetadata(page, 'editable');
    await expect(lock).toBeHidden();
  });
});
