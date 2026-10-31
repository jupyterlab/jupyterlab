/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module mermaid-extension
 */

import type { IMermaidManager } from './tokens';
import { MERMAID_CLASS, MERMAID_MIME_TYPE, WARNING_CLASS } from './tokens';
import type { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import {
  JSONExt,
  PromiseDelegate,
  type ReadonlyPartialJSONObject,
  type ReadonlyPartialJSONValue
} from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';

const SVG_MIME = 'image/svg+xml';

/**
 * A widget for rendering mermaid text-based diagrams, for usage with rendermime.
 */
export class RenderedMermaid extends Widget implements IRenderMime.IRenderer {
  protected static _manager: IMermaidManager | null = null;
  protected static _managerReady = new PromiseDelegate<IMermaidManager>();
  protected _lastRendered: string | null = null;
  private _mimeModel: IRenderMime.IMimeModel | null = null;
  private _renderId = 0;

  /**
   * Create a new widget for rendering Mermaid.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this._mimeType = options.mimeType;
    this.addClass(MERMAID_CLASS);
    if (RenderedMermaid._manager) {
      RenderedMermaid._manager.themeChanged.connect(this._onThemeChanged, this);
    } else {
      void RenderedMermaid._managerReady.promise.then(manager => {
        if (this.isDisposed) {
          return;
        }
        manager.themeChanged.connect(this._onThemeChanged, this);
      });
    }
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
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    if (RenderedMermaid._manager) {
      RenderedMermaid._manager.themeChanged.disconnect(
        this._onThemeChanged,
        this
      );
    }
    this._mimeModel = null;
    super.dispose();
  }

  /**
   * Render mermaid text-based diagrams into this widget's node.
   */
  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    this._mimeModel = model;
    const renderId = ++this._renderId;

    const manager = await RenderedMermaid._managerReady.promise;
    if (this.isDisposed || renderId !== this._renderId) {
      return;
    }

    const text = model.data[this._mimeType] as string | undefined;
    if (text == null || text === this._lastRendered) {
      return;
    }

    // get a div containing a figure or parser message
    const figure = await manager.renderFigure(text);
    if (this.isDisposed || renderId !== this._renderId) {
      return;
    }

    this._lastRendered = text;

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
    const existingMetadata = model.metadata[MERMAID_MIME_TYPE];
    const mermaidMetadata = {
      ...(Private.isReadonlyPartialJSONObject(existingMetadata)
        ? existingMetadata
        : {}),
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

  private _onThemeChanged(): void {
    this._lastRendered = null;
    if (this._mimeModel) {
      void this.renderModel(this._mimeModel);
    }
  }

  private _mimeType: string;
}

namespace Private {
  export function isReadonlyPartialJSONObject(
    value: ReadonlyPartialJSONValue | undefined
  ): value is ReadonlyPartialJSONObject {
    return value !== undefined && JSONExt.isObject(value);
  }
}

/**
 * A mime renderer factory for mermaid text-based diagrams.
 */
export const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: [MERMAID_MIME_TYPE],
  createRenderer: options => new RenderedMermaid(options)
};
