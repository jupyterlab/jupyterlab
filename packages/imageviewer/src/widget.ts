// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PathExt } from '@jupyterlab/coreutils';

import { Printing } from '@jupyterlab/apputils';

import {
  ABCWidgetFactory,
  DocumentRegistry,
  DocumentWidget,
  IDocumentWidget
} from '@jupyterlab/docregistry';

import { PromiseDelegate } from '@lumino/coreutils';

import { Message } from '@lumino/messaging';

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

    this._img = document.createElement('img');
    this.node.appendChild(this._img);

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
      this._startFileWatching();
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
   * Dispose of resources held by the image viewer.
   */
  dispose(): void {
    if (this._img.src) {
      URL.revokeObjectURL(this._img.src || '');
    }
    this._stopFileWatching();
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
    const [tX, tY] = Private.prodVec(this._matrix, [1, 1]);
    const transform = `matrix(${a}, ${b}, ${c}, ${d}, 0, 0) translate(${
      tX < 0 ? -100 : 0
    }%, ${tY < 0 ? -100 : 0}%) `;
    this._img.style.transform = `scale(${this._scale}) ${transform}`;
    this._img.style.filter = `invert(${this._colorinversion})`;
  }

  /**
   * Start watching for file changes and refresh the image when detected.
   */
  private _startFileWatching(): void {
    // Check for file changes every 2 seconds
    this._fileWatchInterval = window.setInterval(() => {
      void this._checkForFileChanges();
    }, 2000);
  }

  /**
   * Stop watching for file changes.
   */
  private _stopFileWatching(): void {
    if (this._fileWatchInterval !== null) {
      clearInterval(this._fileWatchInterval);
      this._fileWatchInterval = null;
    }
  }

  /**
   * Check if the file has changed on disk and refresh if needed.
   */
  private async _checkForFileChanges(): Promise<void> {
    if (this.isDisposed || !this.context.isReady) {
      return;
    }

    try {
      // Access the contents manager through the document manager
      const manager = (this.context as any)._manager;
      if (!manager?.contents) {
        return;
      }

      // Get file metadata without content to check for changes
      const model = await manager.contents.get(this.context.path, {
        content: false,
        hash: true
      });

      const currentModel = this.context.contentsModel;
      if (!currentModel) {
        return;
      }

      // Check if file has changed using hash (preferred) or last_modified
      let hasChanged = false;
      if (model.hash && currentModel.hash) {
        hasChanged = model.hash !== currentModel.hash;
      } else if (model.last_modified && currentModel.last_modified) {
        const diskTime = new Date(model.last_modified).getTime();
        const memoryTime = new Date(currentModel.last_modified).getTime();
        // Allow small time differences to account for filesystem precision
        hasChanged = diskTime > memoryTime + 1000;
      }

      if (hasChanged) {
        // File has changed, refresh the image by reverting to disk version
        await this.context.revert();
      }
    } catch (error) {
      // Ignore errors (file might be temporarily unavailable)
      console.debug('Error checking for file changes:', error);
    }
  }

  private _mimeType: string;
  private _scale = 1;
  private _matrix = [1, 0, 0, 1];
  private _colorinversion = 0;
  private _ready = new PromiseDelegate<void>();
  private _img: HTMLImageElement;
  private _fileWatchInterval: number | null = null;
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
   * Multiply a 2x2 matrix and a 2x1 vector.
   */
  export function prodVec(
    [a11, a12, a21, a22]: number[],
    [b1, b2]: number[]
  ): number[] {
    return [a11 * b1 + a12 * b2, a21 * b1 + a22 * b2];
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
