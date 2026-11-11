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
import type { IRenderMime } from '@jupyterlab/rendermime';
import { defaultRenderMime } from '@jupyterlab/rendermime/lib/testutils';
import { framePromise } from '@jupyterlab/testing';
import { Widget } from '@lumino/widgets';

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
 * A Markdown parser which renders only inline links. Without a parser, the
 * rendered text of a cell is its source.
 */
const LINK_PARSER: IRenderMime.IMarkdownParser = {
  render: async source =>
    source.replace(
      /\[([^\]]*)\]\(((?:[^()]|\([^()]*\))*)\)/g,
      '<a href="$2">$1</a>'
    )
};

/**
 * Create a Markdown cell with the given source, which starts rendered.
 */
function createMarkdownCell(
  source: string,
  options: {
    editable?: boolean;
    showEditorForReadOnlyMarkdown?: boolean;
  } = {}
): MarkdownCell {
  const { editable = true, showEditorForReadOnlyMarkdown = true } = options;
  const model = new MarkdownCellModel({
    sharedModel: createStandaloneCell({
      cell_type: 'markdown',
      source,
      metadata: editable ? {} : { editable: false }
    }) as YMarkdownCell
  });
  return new MarkdownCell({
    model,
    rendermime: defaultRenderMime().clone({ markdownParser: LINK_PARSER }),
    contentFactory: NBTestUtils.createBaseCellFactory(),
    placeholder: false,
    showEditorForReadOnlyMarkdown
  }).initializeState();
}

/**
 * Create a read-only Markdown cell, which starts rendered.
 */
function createReadOnlyMarkdownCell(
  showEditorForReadOnlyMarkdown: boolean
): MarkdownCell {
  return createMarkdownCell('test1 test2', {
    editable: false,
    showEditorForReadOnlyMarkdown
  });
}

/**
 * Text of the match currently marked in the rendered cell, if any.
 */
function renderedCurrentMatch(cell: MarkdownCell): string | null {
  return (
    cell.renderer.node.querySelector('.jp-current-match')?.textContent ?? null
  );
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

    it('should unrender a read-only cell which shows its editor for a match the rendered text does not show', async () => {
      cell = createMarkdownCell(
        'See the [docs](https://example.com) for details.',
        { editable: false, showEditorForReadOnlyMarkdown: true }
      );
      Widget.attach(cell, document.body);
      await framePromise();
      const provider = createCellSearchProvider(cell);
      await provider.startQuery(/example/, {});

      const match = await provider.highlightNext();
      expect(match).toMatchObject({ text: 'example', readOnly: true });
      expect(cell.rendered).toBe(false);
      provider.dispose();
    });

    it('should keep a read-only cell which shows its editor rendered for a match the rendered text shows', async () => {
      cell = createReadOnlyMarkdownCell(true);
      Widget.attach(cell, document.body);
      await framePromise();
      const provider = createCellSearchProvider(cell);
      await provider.startQuery(/test\d/, {});

      const match = await provider.highlightNext();
      expect(match).toMatchObject({ text: 'test1', readOnly: true });
      expect(cell.rendered).toBe(true);
      expect(renderedCurrentMatch(cell)).toBe('test1');
      provider.dispose();
    });

    it('should mark the current match in the rendered text', async () => {
      cell = createReadOnlyMarkdownCell(false);
      Widget.attach(cell, document.body);
      await framePromise();
      const provider = createCellSearchProvider(cell);
      await provider.startQuery(/test\d/, {});

      let match = await provider.highlightNext();
      expect(match).toMatchObject({ text: 'test1', readOnly: true });
      let current = provider.getCurrentMatch();
      expect(current && 'node' in current).toBe(true);
      expect(renderedCurrentMatch(cell)).toBe('test1');

      match = await provider.highlightNext();
      expect(match).toMatchObject({ text: 'test2', readOnly: true });
      expect(renderedCurrentMatch(cell)).toBe('test2');

      match = await provider.highlightPrevious();
      expect(match).toMatchObject({ text: 'test1', readOnly: true });
      expect(renderedCurrentMatch(cell)).toBe('test1');
      provider.dispose();
    });

    it('should not skip the matches before the cursor of the hidden editor', async () => {
      cell = createMarkdownCell('test1 test2');
      Widget.attach(cell, document.body);
      await framePromise();
      // The cursor stays where it was when the cell was rendered
      cell.editor!.setCursorPosition({ line: 0, column: 11 });
      const provider = createCellSearchProvider(cell);
      await provider.startQuery(/test\d/, {});

      // The notebook searches from the selection when a query starts
      const match = await provider.highlightNext(false, {
        from: 'selection-start'
      });
      expect(match?.text).toBe('test1');
      expect(renderedCurrentMatch(cell)).toBe('test1');
      provider.dispose();
    });

    it('should step through visible and hidden matches in source order', async () => {
      cell = createMarkdownCell(
        'The lists are [here](https://example.com/lists) and the lists grow.',
        { editable: false, showEditorForReadOnlyMarkdown: true }
      );
      Widget.attach(cell, document.body);
      await framePromise();
      const provider = createCellSearchProvider(cell);
      await provider.startQuery(/lists/, {});

      let match = await provider.highlightNext();
      expect(match).toMatchObject({ text: 'lists', readOnly: true });
      expect(cell.rendered).toBe(true);
      expect(renderedCurrentMatch(cell)).toBe('lists');
      let current = provider.getCurrentMatch();
      expect(current && 'node' in current).toBe(true);

      match = await provider.highlightNext();
      expect(match).toMatchObject({ text: 'lists', readOnly: true });
      expect(cell.rendered).toBe(false);
      current = provider.getCurrentMatch();
      expect(current && 'node' in current).toBe(false);

      match = await provider.highlightNext();
      expect(match).toMatchObject({ text: 'lists', readOnly: true });
      expect(cell.rendered).toBe(false);
      provider.dispose();
    });

    it('should unrender the cell when a match is in an HTML attribute', async () => {
      cell = createMarkdownCell('<img src="apple.png">\n\nAn apple a day.');
      Widget.attach(cell, document.body);
      await framePromise();
      const provider = createCellSearchProvider(cell);
      await provider.startQuery(/apple/, {});

      const match = await provider.highlightNext();
      expect(match).toMatchObject({ text: 'apple', position: 10 });
      expect(cell.rendered).toBe(false);
      provider.dispose();
    });

    it('should unrender the cell for a match in a link destination with parentheses', async () => {
      cell = createMarkdownCell(
        'The [Python](https://example.com/Python_(language)) page is about Python.'
      );
      Widget.attach(cell, document.body);
      await framePromise();
      const provider = createCellSearchProvider(cell);
      await provider.startQuery(/Python/, {});

      let match = await provider.highlightNext();
      expect(match).toMatchObject({ text: 'Python' });
      expect(cell.rendered).toBe(true);

      match = await provider.highlightNext();
      expect(match).toMatchObject({ text: 'Python', position: 33 });
      expect(cell.rendered).toBe(false);
      provider.dispose();
    });

    it('should not unrender a read-only cell which cannot unrender for a match the rendered text does not show', async () => {
      cell = createMarkdownCell(
        'See the [docs](https://example.com) for details.',
        { editable: false, showEditorForReadOnlyMarkdown: false }
      );
      Widget.attach(cell, document.body);
      await framePromise();
      const provider = createCellSearchProvider(cell);
      await provider.startQuery(/example/, {});

      const match = await provider.highlightNext();
      expect(match).toMatchObject({ text: 'example', readOnly: true });
      expect(cell.rendered).toBe(true);
      expect(renderedCurrentMatch(cell)).toBe(null);
      provider.dispose();
    });

    it('should not flag a rendered match in an editable cell as read-only', async () => {
      cell = createMarkdownCell('test1 test2');
      Widget.attach(cell, document.body);
      await framePromise();
      const provider = createCellSearchProvider(cell);
      await provider.startQuery(/test\d/, {});

      const match = await provider.highlightNext();
      expect(match).toMatchObject({ text: 'test1', readOnly: false });
      expect(cell.rendered).toBe(true);
      expect(renderedCurrentMatch(cell)).toBe('test1');
      expect(provider.getCurrentMatch()?.readOnly).toBe(false);
      provider.dispose();
    });

    it('should flag a rendered match in a non-editable cell as read-only', async () => {
      cell = createReadOnlyMarkdownCell(true);
      Widget.attach(cell, document.body);
      await framePromise();
      const provider = createCellSearchProvider(cell);
      await provider.startQuery(/test\d/, {});

      const match = await provider.highlightNext();
      expect(match).toMatchObject({ text: 'test1', readOnly: true });
      expect(cell.rendered).toBe(true);
      expect(renderedCurrentMatch(cell)).toBe('test1');
      expect(provider.getCurrentMatch()?.readOnly).toBe(true);
      provider.dispose();
    });

    it('should replace the source of a match marked in the rendered text', async () => {
      // The element puts the match in a text node of its own, at another
      // position than in the source
      cell = createMarkdownCell('<b>An</b> apple a day.');
      Widget.attach(cell, document.body);
      await framePromise();
      const provider = createCellSearchProvider(cell);
      await provider.startQuery(/apple/, {});
      await provider.highlightNext();
      expect(renderedCurrentMatch(cell)).toBe('apple');

      expect(await provider.replaceCurrentMatch('pear')).toBe(true);
      expect(cell.model.sharedModel.getSource()).toBe('<b>An</b> pear a day.');
      provider.dispose();
    });

    it('should re-highlight the same source match when the cell is un-rendered mid-search', async () => {
      cell = createMarkdownCell('test1 test2');
      Widget.attach(cell, document.body);
      await framePromise();
      const provider = createCellSearchProvider(cell);
      await provider.startQuery(/test\d/, {});

      await provider.highlightNext();
      const match = await provider.highlightNext();
      expect(match).toMatchObject({ text: 'test2' });
      expect(cell.rendered).toBe(true);
      expect(renderedCurrentMatch(cell)).toBe('test2');

      // Simulate a double-click into edit mode while searching.
      cell.rendered = false;
      await framePromise();

      expect(cell.rendered).toBe(false);
      const current = provider.getCurrentMatch();
      expect(current).toMatchObject({ text: 'test2' });
      expect(current && 'node' in current).toBe(false);
      expect(provider.currentMatchIndex).toBe(1);
      provider.dispose();
    });
  });
});
