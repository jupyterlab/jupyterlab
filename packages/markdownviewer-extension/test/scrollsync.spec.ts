// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IEditorTracker } from '@jupyterlab/fileeditor';
import type { MarkdownDocument } from '@jupyterlab/markdownviewer';
import type { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { Signal } from '@lumino/signaling';

import { MarkdownScrollSyncManager } from '../src/scrollsync';

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
});
