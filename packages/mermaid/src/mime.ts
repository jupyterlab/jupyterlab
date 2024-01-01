/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module mermaid-extension
 */

import {
  IMermaidManager,
  MERMAID_CLASS,
  MERMAID_MIME_TYPE,
  WARNING_CLASS
} from './tokens';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { PromiseDelegate } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';

const SVG_MIME = 'image/svg+xml';

/**
 * A widget for rendering mermaid text-based diagrams, for usage with rendermime.
 */
export class RenderedMermaid extends Widget implements IRenderMime.IRenderer {
  protected static _manager: IMermaidManager | null = null;
  protected static _managerReady = new PromiseDelegate<IMermaidManager>();
  protected _lastRendered: string | null = null;

  /**
   * Create a new widget for rendering Vega/Vega-Lite.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this._mimeType = options.mimeType;
    this.addClass(MERMAID_CLASS);
  }

  static set manager(manager: IMermaidManager) {
    if (RenderedMermaid._manager) {
      console.warn('Mermaid manager may only be set once, and is already set.');
      return;
    }
    RenderedMermaid._manager = manager;
    RenderedMermaid._managerReady.resolve(manager);
  }

  /**
   * Render mermaid text-based diagrams into this widget's node.
   */
  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    const manager = await RenderedMermaid._managerReady.promise;

    const text = model.data[this._mimeType] as string | undefined;
    if (text == null || text === this._lastRendered) {
      return;
    }

    this._lastRendered = text;

    // get a div containing a figure or parser message
    const figure = await manager.renderFigure(text);

    if (figure.classList.contains(WARNING_CLASS)) {
      this.node.classList.add(WARNING_CLASS);
    } else {
      this.node.classList.remove(WARNING_CLASS);
    }

    if (!figure.firstChild) {
      return;
    }

    if (this.node.innerHTML !== figure.innerHTML) {
      this.node.innerHTML = figure.innerHTML;
    }

    // capture the version of mermaid used
    const version = manager.getMermaidVersion();
    const mermaidMetadata = {
      ...((model.metadata[MERMAID_MIME_TYPE] as Record<string, any>) || {}),
      version
    };
    const metadata = {
      ...model.metadata,
      [MERMAID_MIME_TYPE]: mermaidMetadata
    };

    // if available, set the fully-rendered SVG
    const img = figure.querySelector('img');

    if (img) {
      const svg = decodeURIComponent(img.src.split(',')[1]);
      const oldSvg = model.data[SVG_MIME];
      if (svg !== oldSvg) {
        model.setData({
          data: { ...model.data, [SVG_MIME]: svg },
          metadata
        });
      }
    } else {
      const dataWithoutSvg = { ...model.data };
      delete dataWithoutSvg[SVG_MIME];
      model.setData({ data: dataWithoutSvg, metadata });
    }
  }

  private _mimeType: string;
}

/**
 * A mime renderer factory for mermaid text-based diagrams.
 */
export const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: [MERMAID_MIME_TYPE],
  createRenderer: options => new RenderedMermaid(options)
};
