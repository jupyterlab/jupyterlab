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

    const imagePanel = document.createElement('div');
    imagePanel.className = 'jp-ImageViewer-imagePanel';

    this._img = document.createElement('img');
    imagePanel.appendChild(this._img);
    this.node.appendChild(imagePanel);

    const zoomBar = document.createElement('div');
    zoomBar.className = 'jp-ImageViewer-zoomBar';
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.type = 'button';
    zoomOutBtn.className = 'jp-Button jp-mod-minimal jp-mod-small jp-ImageViewer-zoomOut';
    zoomOutBtn.textContent = '-';
    zoomOutBtn.title = 'Zoom out';
    zoomOutBtn.setAttribute('aria-label', 'Zoom out');
    zoomOutBtn.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      this.zoomOut();
    });
    const zoomInBtn = document.createElement('button');
    zoomInBtn.type = 'button';
    zoomInBtn.className = 'jp-Button jp-mod-minimal jp-mod-small jp-ImageViewer-zoomIn';
    zoomInBtn.textContent = '+';
    zoomInBtn.title = 'Zoom in';
    zoomInBtn.setAttribute('aria-label', 'Zoom in');
    zoomInBtn.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      this.zoomIn();
    });
    zoomBar.appendChild(zoomOutBtn);
    zoomBar.appendChild(zoomInBtn);
    this.node.appendChild(zoomBar);

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
    if (value === this._scale) {
      return;
    }
    this._scale = value;
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
   * Dispose of resources held by the image viewer.
   */
  dispose(): void {
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
  }

  private _mimeType: string;
  private _scale = 1;
  private _matrix = [1, 0, 0, 1];
  private _colorinversion = 0;
  private _ready = new PromiseDelegate<void>();
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
