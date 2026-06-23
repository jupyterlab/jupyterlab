// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { CodeEditor } from '@jupyterlab/codeeditor';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import type { IDocumentWidget } from '@jupyterlab/docregistry';
import type { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';
import type {
  IMarkdownViewerTracker,
  MarkdownDocument
} from '@jupyterlab/markdownviewer';
import type {
  IMarkdownParser,
  IRenderMimeRegistry
} from '@jupyterlab/rendermime';
import { TableOfContentsUtils } from '@jupyterlab/toc';
import type { IDisposable } from '@lumino/disposable';
import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';

/**
 * Time window (in milliseconds) during which scroll events on the pane being
 * driven are ignored, to avoid feedback loops between the two panes.
 */
const SYNC_RELEASE_DELAY = 200;

/**
 * Manages synchronized scrolling between Markdown source editors and their
 * rendered previews.
 *
 * When enabled, every file editor that shares its path with an open Markdown
 * preview is linked so that scrolling one pane scrolls the other to the
 * matching location.
 */
export class MarkdownScrollSyncManager implements IDisposable {
  constructor(options: MarkdownScrollSyncManager.IOptions) {
    this._editorTracker = options.editorTracker;
    this._markdownTracker = options.markdownTracker;
    this._rendermime = options.rendermime;
  }

  /**
   * Whether the manager has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Enable or disable scroll synchronization.
   */
  setEnabled(enabled: boolean): void {
    if (this._isDisposed || enabled === this._enabled) {
      return;
    }
    this._enabled = enabled;
    if (enabled) {
      this._editorTracker.widgetAdded.connect(this._pairAll, this);
      this._markdownTracker.widgetAdded.connect(this._pairAll, this);
      this._pairAll();
    } else {
      this._editorTracker.widgetAdded.disconnect(this._pairAll, this);
      this._markdownTracker.widgetAdded.disconnect(this._pairAll, this);
      this._clearPairs();
    }
  }

  /**
   * Dispose of the resources held by the manager.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._editorTracker.widgetAdded.disconnect(this._pairAll, this);
    this._markdownTracker.widgetAdded.disconnect(this._pairAll, this);
    this._clearPairs();
    Signal.clearData(this);
  }

  /**
   * Link every open preview with a matching source editor, when possible.
   */
  private _pairAll(): void {
    this._markdownTracker.forEach(preview => {
      this._pair(preview);
    });
  }

  /**
   * Link a single preview with its matching source editor, if any.
   */
  private _pair(preview: MarkdownDocument): void {
    if (this._pairs.has(preview)) {
      return;
    }
    const path = preview.context.path;
    const editorWidget =
      this._editorTracker.find(widget => widget.context.path === path) ?? null;
    if (!editorWidget) {
      return;
    }
    const pair = new Private.ScrollSyncPair({
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
  private _markdownTracker: IMarkdownViewerTracker;
  private _rendermime: IRenderMimeRegistry;
  private _pairs = new Map<MarkdownDocument, Private.ScrollSyncPair>();
  private _enabled = false;
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
     * The tracker holding the Markdown previews.
     */
    markdownTracker: IMarkdownViewerTracker;

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
   * A source line (0-based) mapped to a vertical offset (in pixels) within the
   * preview scroll container content.
   */
  export interface IScrollMarker {
    line: number;
    top: number;
  }

  /**
   * A source line (0-based) mapped to a heading element in the preview.
   */
  export interface IAnchor {
    line: number;
    element: HTMLElement;
  }

  /**
   * The options used to initialize a `ScrollSyncPair`.
   */
  export interface IPairOptions {
    editorWidget: IDocumentWidget<FileEditor>;
    previewWidget: MarkdownDocument;
    rendermime: IRenderMimeRegistry;
  }

  /**
   * Links a single source editor and preview so that scrolling one scrolls the
   * other.
   *
   * The mapping between the two panes is built from the document headings: each
   * heading's source line is paired with its rendered element, and intermediate
   * positions are linearly interpolated. Documents without headings fall back to
   * proportional scrolling thanks to the synthetic start and end markers.
   */
  export class ScrollSyncPair implements IDisposable {
    constructor(options: IPairOptions) {
      this._editorWidget = options.editorWidget;
      this._previewWidget = options.previewWidget;
      this._rendermime = options.rendermime;
      this._editor = this._editorWidget.content.editor;
      this._editorHost = this._editor.host;
      this._previewScroller = this._previewWidget.content.renderer.node;
      this._expectedEditorTop = this._editorScrollTop();
      this._expectedPreviewTop = this._previewScroller.scrollTop;

      // Scroll events do not bubble, so listen in the capture phase to catch
      // scrolling of the inner CodeMirror scroller.
      this._editorHost.addEventListener('scroll', this, true);
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
      this._editorHost.removeEventListener('scroll', this, true);
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
      if (event.currentTarget === this._editorHost) {
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
          ? this._editorScrollTop()
          : this._previewScroller.scrollTop;
      const expected =
        source === 'editor'
          ? this._expectedEditorTop
          : this._expectedPreviewTop;
      if (Math.abs(top - expected) <= 1) {
        return;
      }
      // Record the new offset before claiming, so the editor offset stays
      // current even when the scroll was induced by our own `revealPosition`.
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
     * The scroll offset of the inner CodeMirror scroller.
     */
    private _editorScrollTop(): number {
      if (!this._editorScroller) {
        this._editorScroller = this._editorHost.querySelector('.cm-scroller');
      }
      return this._editorScroller?.scrollTop ?? 0;
    }

    /**
     * Rebuild the source-line to preview-element anchor list from the headings.
     */
    private async _rebuildAnchors(): Promise<void> {
      const parser: IMarkdownParser | null = this._rendermime.markdownParser;
      if (!parser) {
        this._anchors = [];
        return;
      }
      const source = this._previewWidget.context.model.toString();
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
      if (this._isDisposed) {
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
        anchors.push({ line: headings[i].line, element: elements[i] });
      }
      this._anchors = anchors;
    }

    /**
     * Compute the strictly increasing list of scroll markers from the current
     * anchors, including synthetic markers for the start and end of the
     * document.
     */
    private _markers(): IScrollMarker[] {
      const container = this._previewScroller;
      const containerTop = container.getBoundingClientRect().top;
      const scrollTop = container.scrollTop;
      // Heading offsets in the final viewport are clamped to the largest
      // reachable scroll offset so the markers stay monotonic.
      const maxTop = Math.max(
        container.scrollHeight - container.clientHeight,
        0
      );
      const raw: IScrollMarker[] = [{ line: 0, top: 0 }];
      for (const anchor of this._anchors) {
        const top =
          anchor.element.getBoundingClientRect().top - containerTop + scrollTop;
        raw.push({
          line: anchor.line,
          top: Math.min(Math.max(top, 0), maxTop)
        });
      }
      raw.push({ line: Math.max(this._editor.lineCount - 1, 1), top: maxTop });
      raw.sort((a, b) => a.line - b.line);
      // Keep markers strictly increasing in line so interpolation never divides
      // by zero.
      const markers: IScrollMarker[] = [];
      for (const marker of raw) {
        const last = markers[markers.length - 1];
        if (last && marker.line <= last.line) {
          continue;
        }
        markers.push(marker);
      }
      return markers;
    }

    /**
     * The source line (possibly fractional) visible at the top of the editor.
     */
    private _editorTopLine(): number | null {
      const rect = this._editorHost.getBoundingClientRect();
      if (rect.height === 0) {
        return null;
      }
      const x = rect.left + rect.width / 2;
      const y = rect.top + 1;
      const coordinate: CodeEditor.ICoordinate = {
        left: x,
        right: x,
        top: y,
        bottom: y
      };
      const position = this._editor.getPositionForCoordinate(coordinate);
      if (!position) {
        return null;
      }
      // Refine to a fractional line for smoother syncing.
      const lineCoord = this._editor.getCoordinateForPosition({
        line: position.line,
        column: 0
      });
      let fraction = 0;
      if (lineCoord && lineCoord.bottom > lineCoord.top) {
        fraction =
          (rect.top - lineCoord.top) / (lineCoord.bottom - lineCoord.top);
        fraction = Math.min(Math.max(fraction, 0), 0.999);
      }
      return position.line + fraction;
    }

    /**
     * Scroll the preview to match the top of the editor.
     */
    private _scrollPreviewToEditor(): void {
      const line = this._editorTopLine();
      if (line === null) {
        return;
      }
      const markers = this._markers();
      if (markers.length < 2) {
        return;
      }
      const top = interpolate(markers, line, 'line');
      this._expectedPreviewTop = top;
      this._previewScroller.scrollTop = top;
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
      const maxLine = Math.max(this._editor.lineCount - 1, 0);
      const position = {
        line: Math.min(Math.max(0, Math.round(line)), maxLine),
        column: 0
      };
      if (this._editor instanceof CodeMirrorEditor) {
        this._editor.revealPosition(position, { block: 'start' });
      }
    }

    private _editorWidget: IDocumentWidget<FileEditor>;
    private _previewWidget: MarkdownDocument;
    private _rendermime: IRenderMimeRegistry;
    private _editor: CodeEditor.IEditor;
    private _editorHost: HTMLElement;
    private _editorScroller: HTMLElement | null = null;
    private _previewScroller: HTMLElement;
    private _anchors: IAnchor[] = [];
    private _owner: 'editor' | 'preview' | null = null;
    private _releaseTimer: number | null = null;
    private _expectedEditorTop = 0;
    private _expectedPreviewTop = 0;
    private _isDisposed = false;
    private _disposed = new Signal<this, void>(this);
  }

  /**
   * Linearly interpolate across the marker list.
   *
   * When `by` is `'line'`, map a source line to a preview offset (in pixels).
   * When `by` is `'top'`, map a preview offset (in pixels) to a source line.
   */
  export function interpolate(
    markers: IScrollMarker[],
    value: number,
    by: 'line' | 'top'
  ): number {
    const to = by === 'line' ? 'top' : 'line';
    if (value <= markers[0][by]) {
      return markers[0][to];
    }
    for (let i = 0; i < markers.length - 1; i++) {
      const a = markers[i];
      const b = markers[i + 1];
      if (value < b[by]) {
        const span = b[by] - a[by];
        const fraction = span === 0 ? 0 : (value - a[by]) / span;
        return a[to] + fraction * (b[to] - a[to]);
      }
    }
    return markers[markers.length - 1][to];
  }
}
