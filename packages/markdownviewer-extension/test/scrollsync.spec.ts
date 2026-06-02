// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IEditorTracker } from '@jupyterlab/fileeditor';
import type { IMarkdownViewerTracker } from '@jupyterlab/markdownviewer';
import type { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { Signal } from '@lumino/signaling';

import { MarkdownScrollSyncManager } from '../src/scrollsync';

describe('@jupyterlab/markdownviewer-extension', () => {
  describe('MarkdownScrollSyncManager', () => {
    /**
     * A minimal stand-in for a Markdown preview document.
     */
    class FakePreview {
      constructor(readonly path: string) {}
      get context(): { path: string } {
        return { path: this.path };
      }
    }

    /**
     * A minimal file editor tracker whose `find` never matches, so no
     * `ScrollSyncPair` (which needs a live DOM) is ever constructed.
     */
    class FakeEditorTracker {
      readonly widgetAdded = new Signal<this, void>(this);
      find(): undefined {
        return undefined;
      }
    }

    /**
     * A minimal Markdown viewer tracker that records how often the manager
     * scans the open previews.
     */
    class FakeMarkdownTracker {
      readonly widgetAdded = new Signal<this, void>(this);
      previews: FakePreview[] = [];
      scans = 0;
      forEach(fn: (preview: FakePreview) => void): void {
        this.scans++;
        this.previews.forEach(fn);
      }
    }

    let editorTracker: FakeEditorTracker;
    let markdownTracker: FakeMarkdownTracker;
    let manager: MarkdownScrollSyncManager;

    beforeEach(() => {
      editorTracker = new FakeEditorTracker();
      markdownTracker = new FakeMarkdownTracker();
      markdownTracker.previews = [new FakePreview('notes.md')];
      manager = new MarkdownScrollSyncManager({
        editorTracker: editorTracker as unknown as IEditorTracker,
        markdownTracker: markdownTracker as unknown as IMarkdownViewerTracker,
        rendermime: {} as unknown as IRenderMimeRegistry
      });
    });

    afterEach(() => {
      manager.dispose();
    });

    it('does not scan previews while disabled', () => {
      markdownTracker.widgetAdded.emit();
      expect(markdownTracker.scans).toBe(0);
    });

    it('scans existing previews when enabled and when widgets are added', () => {
      manager.setEnabled(true);
      expect(markdownTracker.scans).toBe(1);

      editorTracker.widgetAdded.emit();
      markdownTracker.widgetAdded.emit();
      expect(markdownTracker.scans).toBe(3);
    });

    it('ignores a redundant setEnabled(true)', () => {
      manager.setEnabled(true);
      manager.setEnabled(true);
      expect(markdownTracker.scans).toBe(1);
    });

    it('stops scanning once disabled', () => {
      manager.setEnabled(true);
      manager.setEnabled(false);
      markdownTracker.widgetAdded.emit();
      expect(markdownTracker.scans).toBe(1);
    });

    it('reports disposal and becomes inert', () => {
      manager.dispose();
      expect(manager.isDisposed).toBe(true);

      manager.setEnabled(true);
      markdownTracker.widgetAdded.emit();
      expect(markdownTracker.scans).toBe(0);
    });
  });
});
