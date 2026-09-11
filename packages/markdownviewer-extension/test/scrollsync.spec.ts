// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IEditorTracker } from '@jupyterlab/fileeditor';
import type { MarkdownDocument } from '@jupyterlab/markdownviewer';
import type { IMarkdownBlockToken } from '@jupyterlab/rendermime';
import type { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { Signal } from '@lumino/signaling';

import { MarkdownScrollSyncManager } from '../src/scrollsync';
import {
  buildBlockAnchors,
  interpolate,
  type IScrollMarker
} from '../src/scrollsyncutils';

describe('@jupyterlab/markdownviewer-extension', () => {
  describe('MarkdownScrollSyncManager', () => {
    /**
     * A minimal stand-in for a Markdown preview document.
     */
    class FakePreview {
      readonly disposed = new Signal<this, void>(this);
      constructor(readonly path: string) {}
      get context(): { path: string } {
        return { path: this.path };
      }
      dispose(): void {
        this.disposed.emit();
      }
    }

    /**
     * A minimal file editor tracker whose `find` never matches, so no
     * `ScrollSyncPair` (which needs a live DOM) is ever constructed. It records
     * how often the manager looks for a matching editor.
     */
    class FakeEditorTracker {
      readonly widgetAdded = new Signal<this, void>(this);
      finds = 0;
      find(): undefined {
        this.finds++;
        return undefined;
      }
    }

    let editorTracker: FakeEditorTracker;
    let manager: MarkdownScrollSyncManager;
    let preview: FakePreview;

    // The manager API is typed against `MarkdownDocument`; the fake provides the
    // small surface the manager actually exercises.
    const asPreview = (fake: FakePreview) =>
      fake as unknown as MarkdownDocument;

    beforeEach(() => {
      editorTracker = new FakeEditorTracker();
      preview = new FakePreview('notes.md');
      manager = new MarkdownScrollSyncManager({
        editorTracker: editorTracker as unknown as IEditorTracker,
        rendermime: {} as unknown as IRenderMimeRegistry
      });
    });

    afterEach(() => {
      manager.dispose();
    });

    it('reports a preview as not synchronized by default', () => {
      expect(manager.isEnabled(asPreview(preview))).toBe(false);
    });

    it('enables and disables synchronization for a preview', () => {
      const changed: MarkdownDocument[] = [];
      manager.enabledChanged.connect((sender, affected) => {
        changed.push(affected);
      });

      manager.setEnabled(asPreview(preview), true);
      expect(manager.isEnabled(asPreview(preview))).toBe(true);

      manager.setEnabled(asPreview(preview), false);
      expect(manager.isEnabled(asPreview(preview))).toBe(false);

      expect(changed).toEqual([asPreview(preview), asPreview(preview)]);
    });

    it('ignores a redundant setEnabled', () => {
      let emissions = 0;
      manager.enabledChanged.connect(() => {
        emissions++;
      });
      manager.setEnabled(asPreview(preview), true);
      manager.setEnabled(asPreview(preview), true);
      expect(emissions).toBe(1);
    });

    it('looks for a matching editor when enabled', () => {
      manager.setEnabled(asPreview(preview), true);
      expect(editorTracker.finds).toBe(1);
    });

    it('pairs an enabled preview when an editor is added later', () => {
      manager.setEnabled(asPreview(preview), true);
      expect(editorTracker.finds).toBe(1);

      editorTracker.widgetAdded.emit();
      expect(editorTracker.finds).toBe(2);
    });

    it('does not look for editors for a disabled preview', () => {
      manager.setEnabled(asPreview(preview), true);
      manager.setEnabled(asPreview(preview), false);
      const before = editorTracker.finds;

      editorTracker.widgetAdded.emit();
      expect(editorTracker.finds).toBe(before);
    });

    it('forgets a preview once it is disposed', () => {
      manager.setEnabled(asPreview(preview), true);
      preview.dispose();
      expect(manager.isEnabled(asPreview(preview))).toBe(false);

      const before = editorTracker.finds;
      editorTracker.widgetAdded.emit();
      expect(editorTracker.finds).toBe(before);
    });

    it('reports disposal and becomes inert', () => {
      manager.dispose();
      expect(manager.isDisposed).toBe(true);

      manager.setEnabled(asPreview(preview), true);
      expect(manager.isEnabled(asPreview(preview))).toBe(false);
      editorTracker.widgetAdded.emit();
      expect(editorTracker.finds).toBe(0);
    });
  });

  describe('buildBlockAnchors', () => {
    const tags = (anchors: { element: Element }[]) =>
      anchors.map(anchor => anchor.element.tagName);

    it('pairs rendered block tokens with top-level preview elements', () => {
      const container = document.createElement('div');
      container.innerHTML = [
        '<h1>Title</h1>',
        '<p>Intro</p>',
        '<p><img src="tall.svg" alt="Tall"></p>',
        '<table><tbody><tr><td>A</td></tr></tbody></table>',
        '<pre><code>const x = 1;</code></pre>',
        '<h2>End</h2>'
      ].join('');
      const tokens: IMarkdownBlockToken[] = [
        { type: 'heading', raw: '# Title\n\n', line: 0 },
        { type: 'space', raw: '\n', line: 1 },
        { type: 'paragraph', raw: 'Intro\n\n', line: 2 },
        { type: 'paragraph', raw: '![Tall](tall.svg)\n\n', line: 4 },
        { type: 'table', raw: '| A |\n| - |\n| 1 |\n\n', line: 6 },
        { type: 'def', raw: '[ref]: https://example.com\n\n', line: 10 },
        { type: 'code', raw: '~~~js\nconst x = 1;\n~~~\n\n', line: 12 },
        { type: 'heading', raw: '## End\n', line: 16 }
      ];

      const anchors = buildBlockAnchors(tokens, container, 3);

      expect(anchors.map(anchor => anchor.line)).toEqual([3, 5, 7, 9, 15, 19]);
      expect(tags(anchors)).toEqual(['H1', 'P', 'P', 'TABLE', 'PRE', 'H2']);
    });

    it('scans past extra elements rendered by a raw HTML block', () => {
      const container = document.createElement('div');
      container.innerHTML = '<div>One</div><div>Two</div><h1>Next</h1>';
      const tokens: IMarkdownBlockToken[] = [
        { type: 'html', raw: '<div>One</div>\n<div>Two</div>\n\n', line: 0 },
        { type: 'heading', raw: '# Next\n', line: 3 }
      ];

      const anchors = buildBlockAnchors(tokens, container);

      expect(anchors.map(anchor => anchor.line)).toEqual([0, 3]);
      expect(tags(anchors)).toEqual(['DIV', 'H1']);
    });

    it('pairs nested loose lists as top-level list anchors', () => {
      const container = document.createElement('div');
      container.innerHTML = [
        '<ul>',
        '<li><p>One</p><ul><li>Nested</li></ul></li>',
        '<li><p>Two</p></li>',
        '</ul>',
        '<p>After list</p>'
      ].join('');
      const tokens: IMarkdownBlockToken[] = [
        { type: 'list', raw: '- One\n  - Nested\n\n- Two\n\n', line: 0 },
        { type: 'paragraph', raw: 'After list\n', line: 5 }
      ];

      const anchors = buildBlockAnchors(tokens, container);

      expect(anchors.map(anchor => anchor.line)).toEqual([0, 5]);
      expect(tags(anchors)).toEqual(['UL', 'P']);
    });

    it('skips raw HTML blocks that render no top-level element', () => {
      const container = document.createElement('div');
      container.innerHTML = '<h1>Visible</h1>';
      const tokens: IMarkdownBlockToken[] = [
        { type: 'html', raw: '<!-- hidden -->\n\n', line: 0 },
        { type: 'heading', raw: '# Visible\n', line: 2 }
      ];

      const anchors = buildBlockAnchors(tokens, container);

      expect(anchors.map(anchor => anchor.line)).toEqual([2]);
      expect(tags(anchors)).toEqual(['H1']);
    });

    it('pairs fenced blocks rendered by a dedicated renderer', () => {
      const container = document.createElement('div');
      container.innerHTML = [
        '<p>Intro</p>',
        '<div class="jp-RenderedMermaid"><figure><img alt="a"></figure></div>',
        '<pre><code>const x = 1;</code></pre>'
      ].join('');
      const tokens: IMarkdownBlockToken[] = [
        { type: 'paragraph', raw: 'Intro\n\n', line: 0 },
        { type: 'code', raw: '```mermaid\ngraph TD;\n```\n\n', line: 2 },
        { type: 'code', raw: '```js\nconst x = 1;\n```\n', line: 6 }
      ];

      const anchors = buildBlockAnchors(tokens, container);

      expect(anchors.map(anchor => anchor.line)).toEqual([0, 2, 6]);
      expect(tags(anchors)).toEqual(['P', 'DIV', 'PRE']);
    });
  });

  describe('interpolate', () => {
    const markers: IScrollMarker[] = [
      { line: 0, top: 0 },
      { line: 10, top: 100 },
      { line: 20, top: 400 }
    ];

    it('maps lines to offsets across segments', () => {
      expect(interpolate(markers, 0, 'line')).toBe(0);
      expect(interpolate(markers, 5, 'line')).toBe(50);
      expect(interpolate(markers, 15, 'line')).toBe(250);
    });

    it('maps offsets back to lines', () => {
      expect(interpolate(markers, 50, 'top')).toBe(5);
      expect(interpolate(markers, 250, 'top')).toBe(15);
    });

    it('clamps values outside the marker range', () => {
      expect(interpolate(markers, -5, 'line')).toBe(0);
      expect(interpolate(markers, 25, 'line')).toBe(400);
      expect(interpolate(markers, -10, 'top')).toBe(0);
      expect(interpolate(markers, 500, 'top')).toBe(20);
    });
  });
});
