// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { YCodeCell, YMarkdownCell } from '@jupyter/ydoc';
import { createStandaloneCell } from '@jupyter/ydoc';
import {
  CodeCell,
  CodeCellModel,
  createCellSearchProvider,
  MarkdownCell,
  MarkdownCellModel
} from '@jupyterlab/cells';
import { NBTestUtils } from '@jupyterlab/cells/lib/testutils';
import { defaultRenderMime } from '@jupyterlab/rendermime/lib/testutils';
import { framePromise } from '@jupyterlab/testing';
import { Widget } from '@lumino/widgets';

/**
 * Create a read-only Markdown cell, which starts rendered.
 */
function createReadOnlyMarkdownCell(
  showEditorForReadOnlyMarkdown: boolean
): MarkdownCell {
  const model = new MarkdownCellModel({
    sharedModel: createStandaloneCell({
      cell_type: 'markdown',
      source: 'test1 test2',
      metadata: { editable: false }
    }) as YMarkdownCell
  });
  return new MarkdownCell({
    model,
    rendermime: defaultRenderMime(),
    contentFactory: NBTestUtils.createBaseCellFactory(),
    placeholder: false,
    showEditorForReadOnlyMarkdown
  }).initializeState();
}

describe('cells/searchprovider', () => {
  describe('createCellSearchProvider()', () => {
    let cell: CodeCell;

    afterEach(() => {
      cell.dispose();
    });

    it('should highlight output matches when a placeholder cell renders after a search starts', async () => {
      const model = new CodeCellModel({
        sharedModel: createStandaloneCell({
          cell_type: 'code',
          source: 'print(text)',
          outputs: [
            {
              output_type: 'stream',
              name: 'stdout',
              text: 'A needle in the hay.\n'
            }
          ]
        }) as YCodeCell
      });
      cell = new CodeCell({
        model,
        rendermime: defaultRenderMime(),
        contentFactory: NBTestUtils.createCodeCellFactory()
      }).initializeState();
      expect(cell.isPlaceholder()).toBe(true);
      const provider = createCellSearchProvider(cell);
      await provider.startQuery(/needle/g, { output: true });

      Widget.attach(cell, document.body);
      await cell.ready;
      await framePromise();
      await framePromise();

      expect(cell.outputArea.node.querySelector('mark')?.textContent).toBe(
        'needle'
      );
      provider.dispose();
    });
  });

  describe('MarkdownCellSearchProvider', () => {
    let cell: MarkdownCell;

    afterEach(() => {
      cell.dispose();
    });

    it('should highlight matches when a placeholder cell renders after a search starts', async () => {
      const model = new MarkdownCellModel({
        sharedModel: createStandaloneCell({
          cell_type: 'markdown',
          source: 'A needle in the hay.'
        }) as YMarkdownCell
      });
      cell = new MarkdownCell({
        model,
        rendermime: defaultRenderMime(),
        contentFactory: NBTestUtils.createBaseCellFactory()
      }).initializeState();
      expect(cell.isPlaceholder()).toBe(true);
      const provider = createCellSearchProvider(cell);
      await provider.startQuery(/needle/g, {});
      expect(provider.matchesCount).toBe(1);

      Widget.attach(cell, document.body);
      await cell.ready;
      await framePromise();
      await framePromise();

      expect(cell.renderer.node.querySelector('mark')?.textContent).toBe(
        'needle'
      );
      provider.dispose();
    });

    it('should highlight the next match in a read-only cell which stays rendered', async () => {
      cell = createReadOnlyMarkdownCell(false);
      const provider = createCellSearchProvider(cell);
      await provider.startQuery(/test\d/, {});

      const match = await provider.highlightNext();
      expect(match).toMatchObject({ text: 'test1' });
      expect(cell.rendered).toBe(true);
      provider.dispose();
    });

    it('should highlight the previous match in a read-only cell which stays rendered', async () => {
      cell = createReadOnlyMarkdownCell(false);
      const provider = createCellSearchProvider(cell);
      await provider.startQuery(/test\d/, {});

      const match = await provider.highlightPrevious();
      expect(match).toMatchObject({ text: 'test2' });
      expect(cell.rendered).toBe(true);
      provider.dispose();
    });

    it('should unrender a read-only cell which shows its editor', async () => {
      cell = createReadOnlyMarkdownCell(true);
      const provider = createCellSearchProvider(cell);
      await provider.startQuery(/test\d/, {});

      await provider.highlightNext();
      expect(cell.rendered).toBe(false);
      provider.dispose();
    });
  });
});
