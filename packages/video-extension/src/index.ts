/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module video-extension
 */

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { Widget } from '@lumino/widgets';

/**
 * The CSS class to add to the Video widget.
 */
const VIDEO_CLASS = 'jp-RenderedVideo';

/**
 * The MIME types for video.
 */
export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'];

/**
 * A widget for rendering video files.
 */
export class RenderedVideo extends Widget implements IRenderMime.IRenderer {
  /**
   * Create a new widget for rendering video.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this._mimeType = options.mimeType;
    this.addClass(VIDEO_CLASS);
    this._video = document.createElement('video');
    this._video.controls = true;
    this.node.appendChild(this._video);
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this._objectUrl) {
      URL.revokeObjectURL(this._objectUrl);
      this._objectUrl = null;
      console.log('Revoked object URL');
    }
    super.dispose();
  }

  /**
   * Render video into this widget's node.
   */
  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    const data = model.data[this._mimeType] as string;
    if (
      !data ||
      (data.length === this._base64.length && data === this._base64)
    ) {
      // Already rendered
      return Promise.resolve(void 0);
    }

    this._base64 = data;
    const blob = Private.b64toBlob(data, this._mimeType);

    // Create and set object URL
    this._objectUrl = URL.createObjectURL(blob);
    this._video.src = this._objectUrl;

    console.log('Done rendering');
  }

  private _base64 = '';
  private _objectUrl: string | null = null;
  private _video: HTMLVideoElement;
  private _mimeType: string;
}

/**
 * A mime renderer factory for video data.
 */
export const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: VIDEO_MIME_TYPES,
  createRenderer: options => new RenderedVideo(options)
};

const extension: IRenderMime.IExtension = {
  id: '@jupyterlab/video-extension:plugin',
  rendererFactory,
  rank: 0,
  dataType: 'string',
  documentWidgetFactoryOptions: {
    name: 'Video',
    modelName: 'base64',
    primaryFileType: 'mp4',
    fileTypes: ['mp4', 'webm'],
    defaultFor: ['mp4', 'webm']
  }
};

export default extension;

namespace Private {
  /**
   * Copied from the pdf-extension
   * TODO: move somewhere else?
   */
  export function b64toBlob(
    b64Data: string,
    contentType: string = '',
    sliceSize: number = 512
  ): Blob {
    const byteCharacters = atob(b64Data);
    const byteArrays: Uint8Array[] = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);

      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  }
}
