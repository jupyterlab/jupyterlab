// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { EditorView } from '@codemirror/view';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import type { IDocumentWidget } from '@jupyterlab/docregistry';
import type { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';
import type { MarkdownDocument } from '@jupyterlab/markdownviewer';
import type {
  IMarkdownParser,
  IRenderMimeRegistry
} from '@jupyterlab/rendermime';
import type { IDisposable } from '@lumino/disposable';
import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';
import {
  buildBlockAnchors,
  type IAnchor,
  interpolate,
  type IScrollMarker
} from './scrollsyncutils';

/**
 * Time (in milliseconds) during which the pane being driven cannot take over
 * as the scroll source, to avoid feedback loops between the two panes.
 */
const SYNC_RELEASE_DELAY = 200;

/**
 * Manages synchronized scrolling between Markdown previews and their source
 * editors: each preview for which it is enabled is linked to the file editor
 * that shares its path.
 */
export class MarkdownScrollSyncManager implements IDisposable {
  /**
   * Construct a new Markdown scroll sync manager.
   */
  constructor(options: MarkdownScrollSyncManager.IOptions) {
    this._editorTracker = options.editorTracker;
    this._rendermime = options.rendermime;
    // The source editor may be opened after its preview was enabled.
    this._editorTracker.widgetAdded.connect(this._pairUnlinked, this);
  }

  /**
   * Whether the manager has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * A signal emitted with the affected preview when its synchronization is
   * toggled.
   */
  get enabledChanged(): ISignal<this, MarkdownDocument> {
    return this._enabledChanged;
  }

  /**
   * Whether scroll synchronization is enabled for a preview.
   */
  isEnabled(preview: MarkdownDocument): boolean {
    return this._links.has(preview);
  }

  /**
   * Enable or disable scroll synchronization for a single preview.
   */
  setEnabled(preview: MarkdownDocument, enabled: boolean): void {
    if (this._isDisposed || enabled === this._links.has(preview)) {
      return;
    }
    if (enabled) {
      this._links.set(preview, null);
      preview.disposed.connect(this._disable, this);
      this._pair(preview);
    } else {
      this._disable(preview);
    }
    this._enabledChanged.emit(preview);
  }

  /**
   * Dispose of the resources held by the manager.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._editorTracker.widgetAdded.disconnect(this._pairUnlinked, this);
    for (const preview of Array.from(this._links.keys())) {
      this._disable(preview);
    }
    Signal.clearData(this);
  }

  private _pairUnlinked(): void {
    for (const [preview, pair] of this._links) {
      if (!pair) {
        this._pair(preview);
      }
    }
  }

  /**
   * Link a preview with the CodeMirror editor open on its path, if any.
   */
  private _pair(preview: MarkdownDocument): void {
    const path = preview.context.path;
    const editorWidget = this._editorTracker.find(
      widget => widget.context.path === path
    );
    const editor = editorWidget?.content.editor;
    if (!editorWidget || !(editor instanceof CodeMirrorEditor)) {
      return;
    }
    const pair = new Private.ScrollSyncPair({
      editor,
      editorWidget,
      previewWidget: preview,
      rendermime: this._rendermime
    });
    this._links.set(preview, pair);
    // The pair goes away with its editor; the preview then waits for another
    // editor on its path.
    pair.disposed.connect(() => {
      if (this._links.get(preview) === pair) {
        this._links.set(preview, null);
        this._pair(preview);
      }
    });
  }

  private _disable(preview: MarkdownDocument): void {
    const pair = this._links.get(preview);
    this._links.delete(preview);
    preview.disposed.disconnect(this._disable, this);
    pair?.dispose();
  }

  private _editorTracker: IEditorTracker;
  private _rendermime: IRenderMimeRegistry;
  /**
   * The enabled previews, mapped to their pair or to `null` while no editor is
   * open on their path.
   */
  private _links = new Map<MarkdownDocument, Private.ScrollSyncPair | null>();
  private _enabledChanged = new Signal<this, MarkdownDocument>(this);
  private _isDisposed = false;
}

/**
 * The namespace for `MarkdownScrollSyncManager` class statics.
 */
export namespace MarkdownScrollSyncManager {
  /**
   * The options used to initialize a `MarkdownScrollSyncManager`.
   */
  export interface IOptions {
    /**
     * The file editor tracker holding the Markdown source editors.
     */
    editorTracker: IEditorTracker;

    /**
     * The rendermime registry, used to access the Markdown parser.
     */
    rendermime: IRenderMimeRegistry;
  }
}

/**
 * A namespace for private scroll-sync data.
 */
namespace Private {
  /**
   * The options used to initialize a `ScrollSyncPair`.
   */
  export interface IPairOptions {
    editor: CodeMirrorEditor;
    editorWidget: IDocumentWidget<FileEditor>;
    previewWidget: MarkdownDocument;
    rendermime: IRenderMimeRegistry;
  }

  /**
   * A synchronized pane.
   */
  type Pane = 'editor' | 'preview';

  /**
   * Links a source editor and a preview so that scrolling one scrolls the
   * other. Source blocks are anchored to their rendered elements and mapped to
   * editor offsets through the CodeMirror height map, interpolating in between.
   */
  export class ScrollSyncPair implements IDisposable {
    /**
     * Construct a new scroll sync pair.
     */
    constructor(options: IPairOptions) {
      this._editorWidget = options.editorWidget;
      this._previewWidget = options.previewWidget;
      this._rendermime = options.rendermime;
      this._editor = options.editor;
      this._editorScroller = this._editor.editor.scrollDOM;
      this._previewScroller = this._previewWidget.content.renderer.node;
      this._expectedTop = {
        editor: this._editorScroller.scrollTop,
        preview: this._previewScroller.scrollTop
      };

      this._editorScroller.addEventListener('scroll', this);
      this._previewScroller.addEventListener('scroll', this);
      this._previewWidget.content.rendered.connect(this._onRendered, this);
      this._editorWidget.disposed.connect(this.dispose, this);
      this._previewWidget.disposed.connect(this.dispose, this);

      void this._previewWidget.content.ready.then(() => {
        if (!this._isDisposed) {
          void this._rebuildAnchors();
        }
      });
    }

    /**
     * Whether the pair has been disposed.
     */
    get isDisposed(): boolean {
      return this._isDisposed;
    }

    /**
     * A signal emitted when the pair is disposed.
     */
    get disposed(): ISignal<this, void> {
      return this._disposed;
    }

    /**
     * Dispose of the resources held by the pair.
     */
    dispose(): void {
      if (this._isDisposed) {
        return;
      }
      this._isDisposed = true;
      this._editorScroller.removeEventListener('scroll', this);
      this._previewScroller.removeEventListener('scroll', this);
      this._previewWidget.content.rendered.disconnect(this._onRendered, this);
      this._editorWidget.disposed.disconnect(this.dispose, this);
      this._previewWidget.disposed.disconnect(this.dispose, this);
      window.clearTimeout(this._releaseTimer);
      this._disposed.emit();
      Signal.clearData(this);
    }

    /**
     * Handle the scroll events of the synchronized panes.
     */
    handleEvent(event: Event): void {
      // A hidden pane has no usable geometry.
      if (
        this._isDisposed ||
        event.type !== 'scroll' ||
        !this._editorWidget.isVisible ||
        !this._previewWidget.isVisible
      ) {
        return;
      }
      if (event.currentTarget === this._editorScroller) {
        this._onScroll('editor');
      } else if (event.currentTarget === this._previewScroller) {
        this._onScroll('preview');
      }
    }

    private _onRendered(): void {
      void this._rebuildAnchors();
    }

    /**
     * Drive the other pane to match the pane that scrolled.
     *
     * Scrolls that merely restore a pane to its expected offset are ignored:
     * this discards both the feedback from a sync we just performed and the
     * offset restored by the browser when a hidden pane is shown again.
     */
    private _onScroll(source: Pane): void {
      const scroller =
        source === 'editor' ? this._editorScroller : this._previewScroller;
      const top = scroller.scrollTop;
      if (Math.abs(top - this._expectedTop[source]) <= 1) {
        return;
      }
      this._expectedTop[source] = top;
      if (!this._claim(source)) {
        return;
      }
      if (source === 'editor') {
        this._scrollPreviewToEditor();
      } else {
        this._scrollEditorToPreview();
      }
    }

    /**
     * Claim scroll ownership for a pane, unless the other pane holds it: the
     * scroll was then induced by the sync itself and must not be echoed back.
     */
    private _claim(owner: Pane): boolean {
      if (this._owner && this._owner !== owner) {
        return false;
      }
      this._owner = owner;
      window.clearTimeout(this._releaseTimer);
      this._releaseTimer = window.setTimeout(() => {
        this._owner = null;
      }, SYNC_RELEASE_DELAY);
      return true;
    }

    /**
     * Rebuild the source line to preview element anchors from the rendered
     * source blocks.
     */
    private async _rebuildAnchors(): Promise<void> {
      // Anchors hold rendered elements, so a stale rebuild finishing late must
      // not overwrite the anchors of a newer rendering pass.
      const generation = ++this._anchorsGeneration;
      // The registry exposes the base parser type, without `getBlockTokens`.
      const parser: IMarkdownParser | null = this._rendermime.markdownParser;
      const { source, lineOffset } = this._previewWidget.content.renderedSource;
      const tokens = parser?.getBlockTokens
        ? await parser.getBlockTokens(source).catch(error => {
            console.error(
              'Failed to parse Markdown blocks for scroll sync',
              error
            );
            return [];
          })
        : [];
      if (this._isDisposed || generation !== this._anchorsGeneration) {
        return;
      }
      this._anchors = buildBlockAnchors(
        tokens,
        this._previewScroller,
        lineOffset
      );
    }

    /**
     * The fractional source line (0-based) aligned with the top of the editor
     * viewport when the editor scroller is at `scrollTop`.
     */
    private _editorLineAt(scrollTop: number): number {
      const view = this._editor.editor;
      const scroller = this._editorScroller;
      // Translate the scroller offset into the document coordinate space used
      // by the CodeMirror height map.
      const docHeight =
        scroller.getBoundingClientRect().top -
        view.documentTop +
        (scrollTop - scroller.scrollTop);
      const block = view.lineBlockAtHeight(docHeight);
      const line = view.state.doc.lineAt(block.from).number - 1;
      const fraction =
        block.height > 0
          ? Math.min(Math.max((docHeight - block.top) / block.height, 0), 0.999)
          : 0;
      return line + fraction;
    }

    /**
     * The gaps between a line block and the text box that `scrollIntoView`
     * aligns, measured on a rendered line.
     */
    private _textInset(): { top: number; bottom: number } {
      const view = this._editor.editor;
      const pos = view.viewport.from;
      const coords = view.coordsAtPos(pos);
      if (!coords) {
        return { top: 0, bottom: 0 };
      }
      const block = view.lineBlockAt(pos);
      const top = view.documentTop + block.top;
      return {
        top: coords.top - top,
        bottom: top + block.height - coords.bottom
      };
    }

    /**
     * The strictly increasing scroll markers mapping source lines to preview
     * offsets: the current anchors, bracketed by the start and end of both
     * scroll ranges so that the panes reach their bottoms together.
     */
    private _markers(): IScrollMarker[] {
      const editor = this._editorScroller;
      const preview = this._previewScroller;
      const previewTop =
        preview.getBoundingClientRect().top - preview.scrollTop;
      const maxTop = Math.max(preview.scrollHeight - preview.clientHeight, 0);
      // The editor may scroll past its last line (`scrollPastEnd` padding);
      // both panes reach the end of their content together instead.
      const editorEnd =
        editor.scrollHeight -
        editor.clientHeight -
        this._editor.editor.documentPadding.bottom;
      const end: IScrollMarker = {
        line: this._editorLineAt(Math.max(editorEnd, 0)),
        top: maxTop
      };
      const markers: IScrollMarker[] = [{ line: 0, top: 0 }];
      for (const { line, element } of this._anchors) {
        const last = markers[markers.length - 1];
        // Elements replaced by a newer rendering pass are skipped until the
        // anchors are rebuilt.
        if (!element.isConnected || line <= last.line || line >= end.line) {
          continue;
        }
        const top = element.getBoundingClientRect().top - previewTop;
        // Keep offsets monotonic so that scrolling one pane never drives the
        // other backwards.
        markers.push({ line, top: Math.min(Math.max(top, last.top), maxTop) });
      }
      if (end.line > markers[markers.length - 1].line) {
        markers.push(end);
      }
      return markers;
    }

    private _scrollPreviewToEditor(): void {
      const markers = this._markers();
      if (markers.length < 2) {
        return;
      }
      const line = this._editorLineAt(this._editorScroller.scrollTop);
      this._previewScroller.scrollTop = interpolate(markers, line, 'line');
      this._expectedTop.preview = this._previewScroller.scrollTop;
    }

    private _scrollEditorToPreview(): void {
      const markers = this._markers();
      if (markers.length < 2) {
        return;
      }
      const line = interpolate(markers, this._previewScroller.scrollTop, 'top');
      const view = this._editor.editor;
      const doc = view.state.doc;
      // Scrolling through CodeMirror lets it measure the target lines first;
      // lines far from the viewport only have estimated heights. The end of the
      // source is aligned with the bottom of the viewport, since the end marker
      // line itself comes from those estimates.
      let target;
      if (line >= markers[markers.length - 1].line) {
        target = EditorView.scrollIntoView(doc.length, {
          y: 'end',
          yMargin: this._textInset().bottom
        });
      } else {
        const index = Math.min(Math.max(Math.floor(line), 0), doc.lines - 1);
        const block = view.lineBlockAt(doc.line(index + 1).from);
        const fraction = Math.min(Math.max(line - index, 0), 1);
        target = EditorView.scrollIntoView(block.from, {
          y: 'start',
          yMargin: this._textInset().top - fraction * block.height
        });
      }
      view.dispatch({ effects: target });
    }

    private _editorWidget: IDocumentWidget<FileEditor>;
    private _previewWidget: MarkdownDocument;
    private _rendermime: IRenderMimeRegistry;
    private _editor: CodeMirrorEditor;
    private _editorScroller: HTMLElement;
    private _previewScroller: HTMLElement;
    private _anchors: IAnchor[] = [];
    private _anchorsGeneration = 0;
    private _owner: Pane | null = null;
    private _releaseTimer: number | undefined;
    private _expectedTop: Record<Pane, number>;
    private _isDisposed = false;
    private _disposed = new Signal<this, void>(this);
  }
}
