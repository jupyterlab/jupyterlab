/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module audio-extension
 */

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { Widget } from '@lumino/widgets';

/**
 * The CSS class to add to the Audio widget.
 */
const AUDIO_CLASS = 'jp-RenderedAudio';

/**
 * The MIME types for audio.
 */
export const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/m4a'
  // TODO: add more mime types
];

/**
 * A widget for rendering audio files.
 */
export class RenderedAudio extends Widget implements IRenderMime.IRenderer {
  /**
   * Create a new widget for rendering audio.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this._mimeType = options.mimeType;
    this.addClass(AUDIO_CLASS);
    this._audio = document.createElement('audio');
    this._audio.controls = true;
    this.node.appendChild(this._audio);
  }

  /**
   * Render audio into this widget's node.
   */
  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    const data = model.data[this._mimeType] as string;
    if (!data) {
      return;
    }

    // Set the source using the base64 data
    this._audio.src = `data:${this._mimeType};base64,${data}`;
  }

  private _audio: HTMLAudioElement;
  private _mimeType: string;
}

/**
 * A mime renderer factory for audio data.
 */
export const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: AUDIO_MIME_TYPES,
  createRenderer: options => new RenderedAudio(options)
};

const extension: IRenderMime.IExtension = {
  id: '@jupyterlab/audio-extension:plugin',
  rendererFactory,
  rank: 0,
  dataType: 'string',
  documentWidgetFactoryOptions: {
    name: 'Audio',
    primaryFileType: 'mp3',
    modelName: 'base64',
    fileTypes: ['aac', 'm4a', 'midi', 'mp3', 'ogg', 'wav'],
    defaultFor: ['aac', 'm4a', 'midi', 'mp3', 'ogg', 'wav']
  }
};

export default extension;
