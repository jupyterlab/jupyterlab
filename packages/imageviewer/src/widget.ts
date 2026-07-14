// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PathExt } from '@jupyterlab/coreutils';

import { Printing } from '@jupyterlab/apputils';

import type {
  DocumentRegistry,
  IDocumentWidget
} from '@jupyterlab/docregistry';
import { ABCWidgetFactory, DocumentWidget } from '@jupyterlab/docregistry';

import { PromiseDelegate } from '@lumino/coreutils';

import type { Message } from '@lumino/messaging';

import { Widget } from '@lumino/widgets';

/**
 * The class name added to a imageviewer.
 */
const IMAGE_CLASS = 'jp-ImageViewer';

/**
 * A widget for images.
 */
export class ImageViewer extends Widget implements Printing.IPrintable {
  /**
   * Construct a new image widget.
   */
  constructor(context: DocumentRegistry.Context) {
    super();
    this.context = context;
    this.node.tabIndex = 0;
    this.addClass(IMAGE_CLASS);
    this.addClass('jp-zoom-target');

    this._imagePanel = document.createElement('div');
    this._imagePanel.className = 'jp-ImageViewer-imagePanel';
    this._imagePanel.addEventListener('wheel', this._evtWheel, {
      passive: false
    });
    this._imagePanel.addEventListener('mousedown', this._evtMouseDown);
    this._imagePanel.addEventListener('dblclick', this._evtDoubleClick);
    this._img = document.createElement('img');
    this._img.addEventListener('load', this._onImageLoaded);
    this._imagePanel.appendChild(this._img);
    this.node.appendChild(this._imagePanel);

    this._onTitleChanged();
    context.pathChanged.connect(this._onTitleChanged, this);

    void context.ready.then(() => {
      if (this.isDisposed) {
        return;
      }
      const contents = context.contentsModel!;
      this._mimeType = contents.mimetype;
      this._render();
      context.model.contentChanged.connect(this.update, this);
      context.fileChanged.connect(this.update, this);
      this._ready.resolve(void 0);
    });
  }

  /**
   * Print in iframe.
   */
  [Printing.symbol]() {
    return (): Promise<void> => Printing.printWidget(this);
  }

  /**
   * The image widget's context.
   */
  readonly context: DocumentRegistry.Context;

  /**
   * A promise that resolves when the image viewer is ready.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  /**
   * The scale factor for the image.
   */
  get scale(): number {
    return this._scale;
  }
  set scale(value: number) {
    const normalized = Math.max(0.05, value);
    if (normalized === this._scale) {
      return;
    }
    this._fitToScreen = false;
    this._scale = normalized;
    this._updateStyle();
  }

  /**
   * The color inversion of the image.
   */
  get colorinversion(): number {
    return this._colorinversion;
  }
  set colorinversion(value: number) {
    if (value === this._colorinversion) {
      return;
    }
    this._colorinversion = value;
    this._updateStyle();
  }

  /**
   * Zoom in (same behavior as the `imageviewer:zoom-in` command).
   */
  zoomIn(): void {
    const s = this._scale;
    this.scale = s > 1 ? s + 0.5 : s * 2;
  }

  /**
   * Zoom out (same behavior as the `imageviewer:zoom-out` command).
   */
  zoomOut(): void {
    const s = this._scale;
    this.scale = s > 1 ? s - 0.5 : s / 2;
  }

  /**
   * Reset zoom to 100%.
   */
  resetZoom(): void {
    this.scale = 1;
  }

  /**
   * Fit image to the visible panel while preserving aspect ratio.
   */
  fitToScreen(): void {
    this._fitToScreen = true;
    this._fitImageToPanel();
  }

  /**
   * Dispose of resources held by the image viewer.
   */
  dispose(): void {
    document.removeEventListener('mousemove', this._evtMouseMove);
    document.removeEventListener('mouseup', this._evtMouseUp);
    this._imagePanel.removeEventListener('wheel', this._evtWheel);
    this._imagePanel.removeEventListener('mousedown', this._evtMouseDown);
    this._imagePanel.removeEventListener('dblclick', this._evtDoubleClick);
    this._img.removeEventListener('load', this._onImageLoaded);
    if (this._img.src) {
      URL.revokeObjectURL(this._img.src || '');
    }
    super.dispose();
  }

  /**
   * Reset rotation and flip transformations.
   */
  resetRotationFlip(): void {
    this._matrix = [1, 0, 0, 1];
    this._updateStyle();
  }

  /**
   * Rotate the image counter-clockwise (left).
   */
  rotateCounterclockwise(): void {
    this._matrix = Private.prod(
      this._matrix,
      Private.rotateCounterclockwiseMatrix
    );
    this._updateStyle();
  }

  /**
   * Rotate the image clockwise (right).
   */
  rotateClockwise(): void {
    this._matrix = Private.prod(this._matrix, Private.rotateClockwiseMatrix);
    this._updateStyle();
  }

  /**
   * Flip the image horizontally.
   */
  flipHorizontal(): void {
    this._matrix = Private.prod(this._matrix, Private.flipHMatrix);
    this._updateStyle();
  }

  /**
   * Flip the image vertically.
   */
  flipVertical(): void {
    this._matrix = Private.prod(this._matrix, Private.flipVMatrix);
    this._updateStyle();
  }

  /**
   * Handle `update-request` messages for the widget.
   */
  protected onUpdateRequest(msg: Message): void {
    if (this.isDisposed || !this.context.isReady) {
      return;
    }
    this._render();
  }

  /**
   * Handle resize messages.
   */
  protected onResize(msg: Widget.ResizeMessage): void {
    super.onResize(msg);
    if (this._fitToScreen) {
      this._fitImageToPanel();
    }
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.focus();
  }

  /**
   * Handle a change to the title.
   */
  private _onTitleChanged(): void {
    this.title.label = PathExt.basename(this.context.localPath);
  }

  /**
   * Render the widget content.
   */
  private _render(): void {
    const context = this.context;
    const cm = context.contentsModel;
    if (!cm) {
      return;
    }
    const oldurl = this._img.src || '';
    let content = context.model.toString();
    if (cm.format === 'base64') {
      this._img.src = `data:${this._mimeType};base64,${content}`;
    } else {
      const a = new Blob([content], { type: this._mimeType });
      this._img.src = URL.createObjectURL(a);
    }
    URL.revokeObjectURL(oldurl);
    this._fitToScreen = true;
  }

  /**
   * Update the image CSS style, including the transform and filter.
   */
  private _updateStyle(): void {
    const [a, b, c, d] = this._matrix;
    // Transform origin is center (CSS); matrix applies rotate/flip around center.
    const transform = `matrix(${a}, ${b}, ${c}, ${d}, 0, 0)`;
    this._img.style.transform = `scale(${this._scale}) ${transform}`;
    this._img.style.filter = `invert(${this._colorinversion})`;
    this._syncPanMode();
  }

  /**
   * Handle image load event.
   */
  private _onImageLoaded = (): void => {
    if (this._fitToScreen) {
      this._fitImageToPanel();
    } else {
      this._syncPanMode();
    }
  };

  /**
   * Fit image dimensions into the panel.
   */
  private _fitImageToPanel(): void {
    const { naturalWidth, naturalHeight } = this._img;
    const { clientWidth, clientHeight } = this._imagePanel;
    if (!naturalWidth || !naturalHeight || !clientWidth || !clientHeight) {
      return;
    }
    const scale = Math.min(
      1,
      clientWidth / naturalWidth,
      clientHeight / naturalHeight
    );
    this._scale = scale;
    this._updateStyle();
    this._imagePanel.scrollLeft = 0;
    this._imagePanel.scrollTop = 0;
  }

  /**
   * Handle Ctrl+wheel zoom.
   */
  private _evtWheel = (event: WheelEvent): void => {
    if (!event.ctrlKey) {
      return;
    }
    event.preventDefault();
    if (event.deltaY < 0) {
      this.zoomIn();
    } else if (event.deltaY > 0) {
      this.zoomOut();
    }
  };

  /**
   * Handle drag start for panning.
   */
  private _evtMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0 || !this._canPan()) {
      return;
    }
    this._isPanning = true;
    this._panStartX = event.clientX;
    this._panStartY = event.clientY;
    this._panStartLeft = this._imagePanel.scrollLeft;
    this._panStartTop = this._imagePanel.scrollTop;
    this._imagePanel.classList.add('jp-mod-panning');
    document.addEventListener('mousemove', this._evtMouseMove);
    document.addEventListener('mouseup', this._evtMouseUp);
    event.preventDefault();
  };

  /**
   * Handle drag move for panning.
   */
  private _evtMouseMove = (event: MouseEvent): void => {
    if (!this._isPanning) {
      return;
    }
    this._imagePanel.scrollLeft =
      this._panStartLeft - (event.clientX - this._panStartX);
    this._imagePanel.scrollTop =
      this._panStartTop - (event.clientY - this._panStartY);
  };

  /**
   * Handle drag end for panning.
   */
  private _evtMouseUp = (): void => {
    if (!this._isPanning) {
      return;
    }
    this._isPanning = false;
    this._imagePanel.classList.remove('jp-mod-panning');
    document.removeEventListener('mousemove', this._evtMouseMove);
    document.removeEventListener('mouseup', this._evtMouseUp);
  };

  /**
   * Toggle quick zoom on double-click.
   */
  private _evtDoubleClick = (event: MouseEvent): void => {
    if (event.button !== 0) {
      return;
    }
    if (this._fitToScreen) {
      this.resetZoom();
    } else {
      this.fitToScreen();
    }
  };

  /**
   * Check whether panning is currently useful.
   */
  private _canPan(): boolean {
    return (
      this._imagePanel.scrollWidth > this._imagePanel.clientWidth ||
      this._imagePanel.scrollHeight > this._imagePanel.clientHeight
    );
  }

  /**
   * Update panning cursor classes.
   */
  private _syncPanMode(): void {
    this._imagePanel.classList.toggle('jp-mod-canPan', this._canPan());
  }

  private _mimeType: string;
  private _scale = 1;
  private _fitToScreen = true;
  private _matrix = [1, 0, 0, 1];
  private _colorinversion = 0;
  private _ready = new PromiseDelegate<void>();
  private _isPanning = false;
  private _panStartX = 0;
  private _panStartY = 0;
  private _panStartLeft = 0;
  private _panStartTop = 0;
  private _imagePanel: HTMLDivElement;
  private _img: HTMLImageElement;
}

/**
 * A widget factory for images.
 */
export class ImageViewerFactory extends ABCWidgetFactory<
  IDocumentWidget<ImageViewer>
> {
  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(
    context: DocumentRegistry.IContext<DocumentRegistry.IModel>
  ): IDocumentWidget<ImageViewer> {
    const content = new ImageViewer(context);
    const widget = new DocumentWidget({ content, context });
    return widget;
  }
}

/**
 * A namespace for image widget private data.
 */
namespace Private {
  /**
   * Multiply 2x2 matrices.
   */
  export function prod(
    [a11, a12, a21, a22]: number[],
    [b11, b12, b21, b22]: number[]
  ): number[] {
    return [
      a11 * b11 + a12 * b21,
      a11 * b12 + a12 * b22,
      a21 * b11 + a22 * b21,
      a21 * b12 + a22 * b22
    ];
  }

  /**
   * Clockwise rotation transformation matrix.
   */
  export const rotateClockwiseMatrix = [0, 1, -1, 0];

  /**
   * Counter-clockwise rotation transformation matrix.
   */
  export const rotateCounterclockwiseMatrix = [0, -1, 1, 0];

  /**
   * Horizontal flip transformation matrix.
   */
  export const flipHMatrix = [-1, 0, 0, 1];

  /**
   * Vertical flip transformation matrix.
   */
  export const flipVMatrix = [1, 0, 0, -1];
}
