/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module mermaid-extension
 */

import type { IMermaidManager } from './tokens';
import {
  MERMAID_CLASS,
  MERMAID_DEFAULT_THEME,
  MERMAID_MIME_TYPE,
  WARNING_CLASS
} from './tokens';
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

  /**
   * Create a new widget for rendering Mermaid.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this._mimeType = options.mimeType;
    this.addClass(MERMAID_CLASS);
    if (RenderedMermaid._manager) {
      RenderedMermaid._manager.themeChanged?.connect(
        this._onThemeChanged,
        this
      );
    } else {
      void RenderedMermaid._managerReady.promise.then(manager => {
        if (this.isDisposed) {
          return;
        }
        manager.themeChanged?.connect(this._onThemeChanged, this);
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

    const children = Array.from(figure.childNodes).map(child =>
      child.cloneNode(true)
    );
    this.node.replaceChildren(...children);

    // A document view, such as the `.mmd` viewer, builds a new model for every
    // render and keeps only the source from `setData()`.
    if (Private.isDocumentModel(model)) {
      return;
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

    if (figure.querySelector('img')) {
      // Keep a stored SVG, so that rendering again does not modify the document.
      if (model.data[SVG_MIME] !== undefined) {
        return;
      }
      // Exports show the stored SVG, so it does not follow the JupyterLab theme.
      let svg: string;
      try {
        ({ svg } = await manager.renderSvg(text, {
          theme: MERMAID_DEFAULT_THEME
        }));
      } catch {
        return;
      }
      if (this.isDisposed || renderId !== this._renderId) {
        return;
      }
      model.setData({
        data: { ...model.data, [SVG_MIME]: svg },
        metadata
      });
    } else if (
      model.data[SVG_MIME] !== undefined ||
      !JSONExt.deepEqual(existingMetadata ?? null, mermaidMetadata)
    ) {
      const dataWithoutSvg = { ...model.data };
      delete dataWithoutSvg[SVG_MIME];
      model.setData({ data: dataWithoutSvg, metadata });
    }
  }

  private _onThemeChanged(): void {
    this._lastRendered = null;
    if (this._mimeModel) {
      // This also stores the SVG when the theme changed during the first render.
      void this.renderModel(this._mimeModel);
    }
  }

  private _mimeType: string;
  private _mimeModel: IRenderMime.IMimeModel | null = null;
  private _renderId = 0;
}

namespace Private {
  export function isReadonlyPartialJSONObject(
    value: ReadonlyPartialJSONValue | undefined
  ): value is ReadonlyPartialJSONObject {
    return value !== undefined && JSONExt.isObject(value);
  }

  /**
   * Whether the model comes from a document view, which passes the URI
   * fragment of the document in `metadata.fragment`.
   */
  export function isDocumentModel(model: IRenderMime.IMimeModel): boolean {
    return 'fragment' in model.metadata;
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
