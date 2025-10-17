/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { b64toBlob, mediaSizeMB, RenderedCommon } from '@jupyterlab/rendermime';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

/**
 * A mime renderer for video data.
 */
export class VideoMimeRenderer extends RenderedCommon {
  /**
   * Maximum allowed media render size in MB.
   */
  MAX_RENDER_SIZE_MB = 100;

  /**
   * Construct a new video mime renderer.
   *
   * @param options - The options for initializing the widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    this.addClass('jp-RenderedVideo');
    this._video = document.createElement('video');
  }

  /**
   * Render a mime model.
   *
   * @param model - The mime model to render.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  async render(model: IRenderMime.IMimeModel): Promise<void> {
    const data = model.data[this.mimeType] as string;
    const size = mediaSizeMB(data);
    if (size > this.MAX_RENDER_SIZE_MB) {
      this.node.textContent = `File too large to render in-browser (${size.toFixed(
        1
      )} MB). Maximum allowed: ${this.MAX_RENDER_SIZE_MB.toFixed(1)} MB.`;
      return;
    }

    const blob = b64toBlob(model.data[this.mimeType] as string, this.mimeType);
    this._video.src = URL.createObjectURL(blob);
    this._video.controls = true;

    this.node.appendChild(this._video);
  }

  private _video: HTMLVideoElement;
}

export const videoRendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: [
    'video/mp4',
    'video/mpeg',
    'video/webm',
    'video/ogg',
    'video/x-msvideo',
    'video/quicktime',
    'video/x-m4v',
    'video/3gpp',
    'video/x-matroska'
  ],
  defaultRank: 100,
  createRenderer: options => new VideoMimeRenderer(options)
};

const extension: IRenderMime.IExtension = {
  id: '@jupyterlab/video-extension:factory',
  description: 'Adds renderer for Video content.',
  rendererFactory: videoRendererFactory,
  dataType: 'string'
};

export default extension;
