// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IJupyterLabPageFixture } from '@jupyterlab/galata';
import { expect, galata, test } from '@jupyterlab/galata';
import type { NotebookPanel } from '@jupyterlab/notebook';
import { MemoryLeakHelper } from './utils';

const GENERATED_CELL_COUNT = 6;
const NOTEBOOK_CELL_COUNT = 8;
const REOPEN_COUNT = 3;
const CLONE_COUNT = 3;
const INSPECTOR_SWITCH_ROUNDS = 5;

const NOTEBOOK_PROTOTYPE_EXPRESSIONS = {
  NotebookPanel: 'window.jupyterapp.shell.currentWidget',
  Notebook: 'window.jupyterapp.shell.currentWidget.content',
  CodeCell: 'window.jupyterapp.shell.currentWidget.content.widgets[0]',
  OutputArea:
    'window.jupyterapp.shell.currentWidget.content.widgets[0].outputArea',
  OutputAreaModel:
    'window.jupyterapp.shell.currentWidget.content.widgets[0].outputArea.model',
  CodeMirrorEditor:
    'window.jupyterapp.shell.currentWidget.content.widgets[0].editor'
} as const;

type NotebookPrototypeName = keyof typeof NOTEBOOK_PROTOTYPE_EXPRESSIONS;

async function captureNotebookPrototypes(
  probe: MemoryLeakHelper,
  names: NotebookPrototypeName[]
): Promise<void> {
  for (const name of names) {
    await probe.capturePrototype(name, NOTEBOOK_PROTOTYPE_EXPRESSIONS[name]);
  }
}

async function uploadNotebook(
  page: IJupyterLabPageFixture,
  tmpPath: string,
  name: string,
  nCells: number
): Promise<void> {
  const notebook = galata.Notebook.generateNotebook(nCells, 'code', [
    'print("hello")'
  ]);
  expect(
    await page.contents.uploadContent(
      JSON.stringify(notebook),
      'text',
      `${tmpPath}/${name}`
    )
  ).toBe(true);
  await page.filebrowser.openDirectory(tmpPath);
}

async function waitForCurrentNotebookReady(
  page: IJupyterLabPageFixture
): Promise<void> {
  await page.evaluate(async () => {
    const current = window.jupyterapp.shell.currentWidget as NotebookPanel;
    await current.revealed;
    await current.context.ready;
    await current.sessionContext.ready;
  });
}

async function waitForNotebookCellCount(
  page: IJupyterLabPageFixture,
  nCells: number
): Promise<void> {
  await expect
    .poll(async () => await page.notebook.getCellCount())
    .toBe(nCells);
}

async function waitForActiveCell(
  page: IJupyterLabPageFixture,
  index: number
): Promise<void> {
  await expect
    .poll(async () => {
      return await page.evaluate(() => {
        const current = window.jupyterapp.shell.currentWidget as NotebookPanel;
        return current.content.activeCellIndex;
      });
    })
    .toBe(index);
}

async function selectCell(
  page: IJupyterLabPageFixture,
  index: number
): Promise<void> {
  expect(await page.notebook.selectCells(index)).toBe(true);
  await waitForActiveCell(page, index);
}

test.describe('Notebook memory lifecycle', () => {
  test.beforeEach(async ({ browserName }) => {
    test.skip(
      browserName !== 'chromium',
      'Memory leak checks use the Chromium DevTools Protocol.'
    );
  });

  test('should release cell widgets after deleting executed cells', async ({
    page
  }) => {
    const probe = await MemoryLeakHelper.create(page);
    try {
      expect(await page.notebook.createNew('delete-executed-cells.ipynb')).toBe(
        'delete-executed-cells.ipynb'
      );
      expect(await page.notebook.setCell(0, 'code', 'print("baseline")')).toBe(
        true
      );
      expect(await page.notebook.runCell(0, { inplace: true })).toBe(true);

      const firstOutput = await page.notebook.getCellOutputLocator(0);
      if (!firstOutput) {
        throw new Error(
          'Expected an output area after running the baseline cell.'
        );
      }
      await expect(firstOutput).toContainText('baseline');

      await captureNotebookPrototypes(probe, [
        'CodeCell',
        'OutputArea',
        'OutputAreaModel',
        'CodeMirrorEditor'
      ]);
      const baseline = await probe.countObjects();

      for (let i = 1; i <= GENERATED_CELL_COUNT; i++) {
        expect(
          await page.notebook.addCell('code', `print("generated ${i}")`)
        ).toBe(true);
        expect(await page.notebook.runCell(i, { inplace: true })).toBe(true);
      }

      await waitForNotebookCellCount(page, GENERATED_CELL_COUNT + 1);
      expect(await page.notebook.selectCells(1, GENERATED_CELL_COUNT)).toBe(
        true
      );
      expect(await page.notebook.deleteCells()).toBe(true);
      await waitForNotebookCellCount(page, 1);

      await probe.expectObjectCountsAtMost(baseline);
    } finally {
      await probe.dispose();
    }
  });

  test('should release notebook widgets after closing notebooks', async ({
    page,
    tmpPath
  }) => {
    const notebookName = 'closed-notebook.ipynb';
    await uploadNotebook(page, tmpPath, notebookName, NOTEBOOK_CELL_COUNT);

    const probe = await MemoryLeakHelper.create(page);
    try {
      expect(await page.notebook.openByPath(`${tmpPath}/${notebookName}`)).toBe(
        true
      );
      await waitForNotebookCellCount(page, NOTEBOOK_CELL_COUNT);
      await waitForCurrentNotebookReady(page);
      await captureNotebookPrototypes(probe, [
        'NotebookPanel',
        'Notebook',
        'CodeCell',
        'OutputArea',
        'CodeMirrorEditor'
      ]);
      expect(await page.notebook.close()).toBe(true);
      await expect(page.locator('.jp-NotebookPanel')).toHaveCount(0);
      const baseline = await probe.countObjects();

      for (let i = 0; i < REOPEN_COUNT; i++) {
        expect(
          await page.notebook.openByPath(`${tmpPath}/${notebookName}`)
        ).toBe(true);
        await waitForNotebookCellCount(page, NOTEBOOK_CELL_COUNT);
        await waitForCurrentNotebookReady(page);
        expect(await page.notebook.close()).toBe(true);
        await expect(page.locator('.jp-NotebookPanel')).toHaveCount(0);
      }

      await probe.expectObjectCountsAtMost(baseline);
    } finally {
      await probe.dispose();
    }
  });

  test('should release notebook widgets after closing cloned views', async ({
    page,
    tmpPath
  }) => {
    const notebookName = 'cloned-notebook.ipynb';
    await uploadNotebook(page, tmpPath, notebookName, NOTEBOOK_CELL_COUNT);
    expect(await page.notebook.openByPath(`${tmpPath}/${notebookName}`)).toBe(
      true
    );
    await waitForNotebookCellCount(page, NOTEBOOK_CELL_COUNT);
    await waitForCurrentNotebookReady(page);

    const probe = await MemoryLeakHelper.create(page);
    try {
      await captureNotebookPrototypes(probe, [
        'Notebook',
        'CodeCell',
        'OutputArea',
        'CodeMirrorEditor'
      ]);
      const baseline = await probe.countObjects();

      for (let i = 0; i < CLONE_COUNT; i++) {
        await page.evaluate(async () => {
          await window.jupyterapp.commands.execute('docmanager:clone');
        });
        await expect(page.locator('.jp-NotebookPanel')).toHaveCount(2);
        await waitForNotebookCellCount(page, NOTEBOOK_CELL_COUNT);
        await waitForCurrentNotebookReady(page);

        await page.evaluate(async () => {
          await window.jupyterapp.commands.execute('application:close');
        });
        await expect(page.locator('.jp-NotebookPanel')).toHaveCount(1);
      }

      await probe.expectObjectCountsAtMost(baseline);
    } finally {
      await probe.dispose();
    }
  });

  test('should not retain metadata editors while switching cells', async ({
    page
  }) => {
    expect(
      await page.notebook.createNew('metadata-editors.ipynb', {
        kernel: null
      })
    ).toBe('metadata-editors.ipynb');
    expect(await page.notebook.setCell(0, 'code', 'print("first")')).toBe(true);
    expect(await page.notebook.addCell('code', 'print("second")')).toBe(true);
    expect(await page.notebook.addCell('code', 'print("third")')).toBe(true);
    await waitForNotebookCellCount(page, 3);

    await page.sidebar.openTab('jp-property-inspector');
    await page.click('.jp-PropertyInspector >> text=Common Tools');
    await page
      .locator('.jp-NotebookTools .jp-Collapse', {
        hasText: 'Advanced Tools'
      })
      .click();
    await expect(
      page.locator('.jp-CellMetadataEditor .cm-content')
    ).toBeVisible();

    const probe = await MemoryLeakHelper.create(page);
    try {
      await captureNotebookPrototypes(probe, ['CodeMirrorEditor']);
      const baseline = await probe.countObjects(['CodeMirrorEditor']);

      for (let round = 0; round < INSPECTOR_SWITCH_ROUNDS; round++) {
        for (let index = 0; index < 3; index++) {
          await selectCell(page, index);
        }
      }

      await probe.expectObjectCountsAtMost(baseline, {
        names: ['CodeMirrorEditor']
      });
    } finally {
      await probe.dispose();
    }
  });
});
