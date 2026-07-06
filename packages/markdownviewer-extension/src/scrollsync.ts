// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import type { IDocumentWidget } from '@jupyterlab/docregistry';
import type { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';
import type { MarkdownDocument } from '@jupyterlab/markdownviewer';
import type {
  IMarkdownParser,
  IRenderMimeRegistry
} from '@jupyterlab/rendermime';
import { TableOfContentsUtils } from '@jupyterlab/toc';
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
 * Time window (in milliseconds) during which scroll events on the pane being
 * driven are ignored, to avoid feedback loops between the two panes.
 */
const SYNC_RELEASE_DELAY = 200;

/**
 * Manages synchronized scrolling between Markdown source editors and their
 * rendered previews.
 *
 * Synchronization is tracked per preview: each preview for which it is enabled
 * is linked to the file editor that shares its path, so that scrolling one pane
 * scrolls the other to the matching location. Enabling or disabling a preview
 * affects only that preview, not the global `syncScrolling` setting.
 *
 * Only CodeMirror source editors are synchronized: mapping scroll offsets to
 * source lines requires the CodeMirror view.
 */
export class MarkdownScrollSyncManager implements IDisposable {
  /**
   * Construct a new Markdown scroll sync manager.
   */
  constructor(options: MarkdownScrollSyncManager.IOptions) {
    this._editorTracker = options.editorTracker;
    this._rendermime = options.rendermime;
    // A source editor may be opened after sync has been enabled for its
    // preview, so watch for new editors to pair them retroactively.
    this._editorTracker.widgetAdded.connect(this._onEditorAdded, this);
  }

  /**
   * Whether the manager has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * A signal emitted when scroll synchronization is toggled for a preview.
   *
   * The emitted value is the affected preview.
   */
  get enabledChanged(): ISignal<this, MarkdownDocument> {
    return this._enabledChanged;
  }

  /**
   * Whether scroll synchronization is enabled for a given preview.
   */
  isEnabled(preview: MarkdownDocument): boolean {
    return this._enabled.has(preview);
  }

  /**
   * Enable or disable scroll synchronization for a single preview.
   *
   * This affects only the given preview; it does not change the global
   * `syncScrolling` setting.
   */
  setEnabled(preview: MarkdownDocument, enabled: boolean): void {
    if (this._isDisposed || enabled === this._enabled.has(preview)) {
      return;
    }
    if (enabled) {
      this._enabled.add(preview);
      // Forget the preview once it is closed.
      preview.disposed.connect(this._onPreviewDisposed, this);
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
    this._editorTracker.widgetAdded.disconnect(this._onEditorAdded, this);
    for (const preview of this._enabled) {
      preview.disposed.disconnect(this._onPreviewDisposed, this);
    }
    this._enabled.clear();
    this._clearPairs();
    Signal.clearData(this);
  }

  /**
   * React to a new source editor by pairing it with any enabled preview that
   * shares its path.
   */
  private _onEditorAdded(): void {
    for (const preview of this._enabled) {
      this._pair(preview);
    }
  }

  /**
   * React to a preview being closed by disabling its synchronization.
   */
  private _onPreviewDisposed(preview: MarkdownDocument): void {
    this._disable(preview);
  }

  /**
   * Disable synchronization for a preview and release its resources.
   */
  private _disable(preview: MarkdownDocument): void {
    this._enabled.delete(preview);
    preview.disposed.disconnect(this._onPreviewDisposed, this);
    this._unpair(preview);
  }

  /**
   * Link a single preview with its matching source editor, if any.
   */
  private _pair(preview: MarkdownDocument): void {
    if (this._pairs.has(preview) || !this._enabled.has(preview)) {
      return;
    }
    const path = preview.context.path;
    const editorWidget =
      this._editorTracker.find(widget => widget.context.path === path) ?? null;
    if (!editorWidget) {
      return;
    }
    const editor = editorWidget.content.editor;
    if (!(editor instanceof CodeMirrorEditor)) {
      return;
    }
    const pair = new Private.ScrollSyncPair({
      editor,
      editorWidget,
      previewWidget: preview,
      rendermime: this._rendermime
    });
    // Keying by the preview widget keeps the pair valid across file renames.
    this._pairs.set(preview, pair);
    pair.disposed.connect(() => {
      this._pairs.delete(preview);
    });
  }

  /**
   * Dispose of the active pair for a preview, if any.
   */
  private _unpair(preview: MarkdownDocument): void {
    const pair = this._pairs.get(preview);
    if (pair) {
      this._pairs.delete(preview);
      pair.dispose();
    }
  }

  /**
   * Dispose of all the active pairs.
   */
  private _clearPairs(): void {
    const pairs = Array.from(this._pairs.values());
    this._pairs.clear();
    for (const pair of pairs) {
      pair.dispose();
    }
  }

  private _editorTracker: IEditorTracker;
  private _rendermime: IRenderMimeRegistry;
  private _pairs = new Map<MarkdownDocument, Private.ScrollSyncPair>();
  private _enabled = new Set<MarkdownDocument>();
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
   * Links a single source editor and preview so that scrolling one scrolls the
   * other.
   *
   * Each source block line is anchored to its rendered element and mapped to
   * editor offsets through the CodeMirror height map, interpolating in
   * between, so blocks of very different heights (such as images) stay
   * aligned and both panes reach their bottoms together. Documents without
   * block metadata fall back to heading anchors or proportional scrolling.
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
      this._expectedEditorTop = this._editorScroller.scrollTop;
      this._expectedPreviewTop = this._previewScroller.scrollTop;

      this._editorScroller.addEventListener('scroll', this);
      this._previewScroller.addEventListener('scroll', this);
      this._previewWidget.content.rendered.connect(this._onRendered, this);
      this._editorWidget.disposed.connect(this._onWidgetDisposed, this);
      this._previewWidget.disposed.connect(this._onWidgetDisposed, this);

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
      this._editorWidget.disposed.disconnect(this._onWidgetDisposed, this);
      this._previewWidget.disposed.disconnect(this._onWidgetDisposed, this);
      if (this._releaseTimer !== null) {
        window.clearTimeout(this._releaseTimer);
      }
      this._disposed.emit();
      Signal.clearData(this);
    }

    /**
     * Handle the DOM events for the synchronized panes.
     *
     * @param event - The DOM event sent to the pair.
     */
    handleEvent(event: Event): void {
      if (this._isDisposed || event.type !== 'scroll') {
        return;
      }
      // A hidden pane has no usable geometry, so only sync when both are shown.
      if (!this._editorWidget.isVisible || !this._previewWidget.isVisible) {
        return;
      }
      if (event.currentTarget === this._editorScroller) {
        this._onScroll('editor');
      } else if (event.currentTarget === this._previewScroller) {
        this._onScroll('preview');
      }
    }

    /**
     * React to a scroll of one pane and drive the other to match.
     *
     * Scrolls that merely restore a pane to its expected offset are ignored:
     * this discards both the feedback from a sync we just performed and the
     * offset restored by the browser when a hidden pane is shown again.
     */
    private _onScroll(source: 'editor' | 'preview'): void {
      const top =
        source === 'editor'
          ? this._editorScroller.scrollTop
          : this._previewScroller.scrollTop;
      const expected =
        source === 'editor'
          ? this._expectedEditorTop
          : this._expectedPreviewTop;
      if (Math.abs(top - expected) <= 1) {
        return;
      }
      // Record the new offset before claiming, so the offset stays current
      // even when the scroll was induced by our own synchronization.
      if (source === 'editor') {
        this._expectedEditorTop = top;
      } else {
        this._expectedPreviewTop = top;
      }
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
     * Claim scroll ownership for one pane.
     *
     * Returns `false` if the other pane is currently the active scroll source,
     * so the scroll it induced on this pane is ignored.
     */
    private _claim(owner: 'editor' | 'preview'): boolean {
      if (this._owner && this._owner !== owner) {
        return false;
      }
      this._owner = owner;
      if (this._releaseTimer !== null) {
        window.clearTimeout(this._releaseTimer);
      }
      this._releaseTimer = window.setTimeout(() => {
        this._owner = null;
        this._releaseTimer = null;
      }, SYNC_RELEASE_DELAY);
      return true;
    }

    private _onWidgetDisposed(): void {
      this.dispose();
    }

    private _onRendered(): void {
      void this._rebuildAnchors();
    }

    /**
     * Rebuild the source-line to preview-element anchor list from the blocks.
     */
    private async _rebuildAnchors(): Promise<void> {
      // Anchors hold rendered elements, so a stale rebuild finishing late
      // must not overwrite the anchors of a newer rendering pass.
      const generation = ++this._anchorsGeneration;
      const parser: IMarkdownParser | null = this._rendermime.markdownParser;
      if (!parser) {
        this._anchors = [];
        return;
      }
      const { source, lineOffset } = this._previewWidget.content.renderedSource;
      if (parser.getBlockTokens) {
        try {
          const tokens = await parser.getBlockTokens(source);
          if (this._isDisposed || generation !== this._anchorsGeneration) {
            return;
          }
          const anchors = buildBlockAnchors(
            tokens,
            this._previewScroller,
            lineOffset
          );
          if (anchors.length > 0) {
            this._anchors = anchors;
            return;
          }
        } catch (error) {
          console.error(
            'Failed to parse Markdown blocks for scroll sync',
            error
          );
        }
      }

      let headings: TableOfContentsUtils.Markdown.IMarkdownHeading[];
      try {
        headings = await TableOfContentsUtils.Markdown.parseHeadings(
          source,
          parser
        );
      } catch (error) {
        console.error(
          'Failed to parse Markdown headings for scroll sync',
          error
        );
        return;
      }
      if (this._isDisposed || generation !== this._anchorsGeneration) {
        return;
      }
      // Headings and rendered elements share document order, so pair them by index.
      const elements = Array.from(
        this._previewScroller.querySelectorAll<HTMLElement>(
          'h1, h2, h3, h4, h5, h6'
        )
      );
      const count = Math.min(headings.length, elements.length);
      const anchors: IAnchor[] = [];
      for (let i = 0; i < count; i++) {
        anchors.push({
          line: headings[i].line + lineOffset,
          element: elements[i]
        });
      }
      this._anchors = anchors;
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
     * The editor scroller offset that aligns the top of the editor viewport
     * with the given fractional source line (0-based).
     */
    private _editorScrollTopAt(line: number): number {
      const view = this._editor.editor;
      const scroller = this._editorScroller;
      const doc = view.state.doc;
      const clamped = Math.min(Math.max(line, 0), doc.lines - 1);
      const index = Math.floor(clamped);
      const block = view.lineBlockAt(doc.line(index + 1).from);
      const docHeight = block.top + (clamped - index) * block.height;
      return (
        scroller.scrollTop +
        view.documentTop +
        docHeight -
        scroller.getBoundingClientRect().top
      );
    }

    /**
     * Compute the strictly increasing list of scroll markers from the current
     * anchors, including synthetic markers for the start and end of both
     * scroll ranges.
     */
    private _markers(): IScrollMarker[] {
      const container = this._previewScroller;
      const containerTop = container.getBoundingClientRect().top;
      const scrollTop = container.scrollTop;
      // Anchor offsets in the final viewport are clamped to the largest
      // reachable scroll offset so the markers stay within the scroll range.
      const maxTop = Math.max(
        container.scrollHeight - container.clientHeight,
        0
      );
      const raw: IScrollMarker[] = [{ line: 0, top: 0 }];
      for (const anchor of this._anchors) {
        // Skip anchors whose elements were replaced by a newer rendering
        // pass; the anchor list is rebuilt shortly after.
        if (!anchor.element.isConnected) {
          continue;
        }
        const top =
          anchor.element.getBoundingClientRect().top - containerTop + scrollTop;
        raw.push({
          line: anchor.line,
          top: Math.min(Math.max(top, 0), maxTop)
        });
      }
      // Map the ends of the two scroll ranges to each other, so that both
      // panes reach their respective bottoms together.
      const editorMaxTop = Math.max(
        this._editorScroller.scrollHeight - this._editorScroller.clientHeight,
        0
      );
      raw.push({ line: this._editorLineAt(editorMaxTop), top: maxTop });
      raw.sort((a, b) => a.line - b.line);
      // Keep lines strictly increasing so interpolation never divides by
      // zero, and tops monotonic so scrolling one pane never drives the other
      // backwards.
      const markers: IScrollMarker[] = [];
      for (const marker of raw) {
        const last = markers[markers.length - 1];
        if (last && marker.line <= last.line) {
          continue;
        }
        markers.push(
          last && marker.top < last.top
            ? { line: marker.line, top: last.top }
            : marker
        );
      }
      return markers;
    }

    /**
     * Scroll the preview to match the top of the editor.
     */
    private _scrollPreviewToEditor(): void {
      const markers = this._markers();
      if (markers.length < 2) {
        return;
      }
      const line = this._editorLineAt(this._editorScroller.scrollTop);
      this._previewScroller.scrollTop = interpolate(markers, line, 'line');
      this._expectedPreviewTop = this._previewScroller.scrollTop;
    }

    /**
     * Scroll the editor to match the top of the preview.
     */
    private _scrollEditorToPreview(): void {
      const markers = this._markers();
      if (markers.length < 2) {
        return;
      }
      const line = interpolate(markers, this._previewScroller.scrollTop, 'top');
      this._editorScroller.scrollTop = this._editorScrollTopAt(line);
      this._expectedEditorTop = this._editorScroller.scrollTop;
    }

    private _editorWidget: IDocumentWidget<FileEditor>;
    private _previewWidget: MarkdownDocument;
    private _rendermime: IRenderMimeRegistry;
    private _editor: CodeMirrorEditor;
    private _editorScroller: HTMLElement;
    private _previewScroller: HTMLElement;
    private _anchors: IAnchor[] = [];
    private _anchorsGeneration = 0;
    private _owner: 'editor' | 'preview' | null = null;
    private _releaseTimer: number | null = null;
    private _expectedEditorTop = 0;
    private _expectedPreviewTop = 0;
    private _isDisposed = false;
    private _disposed = new Signal<this, void>(this);
  }
}
