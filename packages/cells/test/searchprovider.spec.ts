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

/**
 * Create a code cell which was never rendered, like the cells a windowed
 * notebook has not scrolled to yet.
 */
function createPlaceholderCell(editable = true): CodeCell {
  const model = new CodeCellModel({
    sharedModel: createStandaloneCell({
      cell_type: 'code',
      source: 'test1 test2',
      metadata: editable ? {} : { editable: false }
    }) as YCodeCell
  });
  return new CodeCell({
    model,
    rendermime: defaultRenderMime(),
    contentFactory: NBTestUtils.createCodeCellFactory()
  }).initializeState();
}

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

    it('should flag matches in a read-only placeholder cell', async () => {
      cell = createPlaceholderCell(false);
      expect(cell.isPlaceholder()).toBe(true);
      const provider = createCellSearchProvider(cell);
      await provider.startQuery(/test\d/, {});

      const match = await provider.highlightNext();
      expect(match).toMatchObject({ text: 'test1', readOnly: true });
      expect(provider.getCurrentMatch()?.readOnly).toBe(true);
      provider.dispose();
    });

    it('should not replace in a read-only placeholder cell', async () => {
      cell = createPlaceholderCell(false);
      const provider = createCellSearchProvider(cell);
      await provider.startQuery(/test\d/, {});
      await provider.highlightNext();

      expect(await provider.replaceCurrentMatch('bar')).toBe(false);
      expect(await provider.replaceAllMatches('bar')).toBe(false);
      expect(cell.model.sharedModel.getSource()).toBe('test1 test2');
      provider.dispose();
    });

    it('should replace in an editable placeholder cell', async () => {
      cell = createPlaceholderCell();
      const provider = createCellSearchProvider(cell);
      await provider.startQuery(/test\d/, {});
      await provider.highlightNext();

      expect(provider.getCurrentMatch()?.readOnly).toBe(false);
      expect(await provider.replaceAllMatches('bar')).toBe(true);
      expect(cell.model.sharedModel.getSource()).toBe('bar bar');
      provider.dispose();
    });
  });

  describe('MarkdownCellSearchProvider', () => {
    let cell: MarkdownCell;

    afterEach(() => {
      cell.dispose();
    });

    it('should highlight the next match in a read-only cell which stays rendered', async () => {
      cell = createReadOnlyMarkdownCell(false);
      const provider = createCellSearchProvider(cell);
      await provider.startQuery(/test\d/, {});

      const match = await provider.highlightNext();
      expect(match).toMatchObject({ text: 'test1', readOnly: true });
      expect(cell.rendered).toBe(true);
      provider.dispose();
    });

    it('should highlight the previous match in a read-only cell which stays rendered', async () => {
      cell = createReadOnlyMarkdownCell(false);
      const provider = createCellSearchProvider(cell);
      await provider.startQuery(/test\d/, {});

      const match = await provider.highlightPrevious();
      expect(match).toMatchObject({ text: 'test2', readOnly: true });
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
