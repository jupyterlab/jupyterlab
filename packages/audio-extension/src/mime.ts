/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { b64toBlob, mediaSizeMB, RenderedCommon } from '@jupyterlab/rendermime';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

/**
 * A mime renderer for audio data.
 */
export class AudioMimeRenderer extends RenderedCommon {
  /**
   * Maximum allowed media render size in MB.
   */
  MAX_RENDER_SIZE_MB = 20;

  /**
   * Construct a new audio mime renderer.
   *
   * @param options - The options for initializing the widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
    this.addClass('jp-RenderedAudio');
    this._audio = document.createElement('audio');
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

    const blob = b64toBlob(data, this.mimeType);
    this._audio.src = URL.createObjectURL(blob);
    this._audio.controls = true;

    this.node.appendChild(this._audio);
  }

  private _audio: HTMLAudioElement;
}

export const audioRendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: [
    'audio/aac',
    'audio/midi',
    'audio/x-midi',
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
    'audio/mp4',
    'audio/flac',
    'audio/opus',
    'audio/mp3'
  ],
  defaultRank: 100,
  createRenderer: options => new AudioMimeRenderer(options)
};

const extension: IRenderMime.IExtension = {
  id: '@jupyterlab/audio-extension:factory',
  description: 'Adds renderer for Audio content.',
  rendererFactory: audioRendererFactory,
  dataType: 'string'
};

export default extension;
