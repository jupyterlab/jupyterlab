// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Contents, Session
} from '@jupyterlab/services';

import {
  ArrayExt, ArrayIterator, IIterable, find, map, toArray
} from '@phosphor/algorithm';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  Widget
} from '@phosphor/widgets';

import {
  IObservableJSON, PathExt, URLExt
} from '@jupyterlab/coreutils';

import {
  ISanitizer, defaultSanitizer
} from '@jupyterlab/apputils';

import {
  MimeModel
} from './mimemodel';

import {
  HTMLRenderer, LatexRenderer, ImageRenderer, TextRenderer,
  JavaScriptRenderer, SVGRenderer, MarkdownRenderer, PDFRenderer
} from './renderers';

import {
  RenderedText
} from './widgets';

/**
 * A composite renderer.
 *
 * #### Notes
 * When rendering a mimebundle, a mimeType is selected from the mimeTypes by
 * searching through the `this.order` list. The first mimeType found in the
 * bundle determines the renderer that will be used.
 *
 * You can add a renderer by adding it to the `renderers` object and
 * registering the mimeType in the `order` array.
 *
 * Untrusted bundles are handled differently from trusted ones.  Untrusted
 * bundles will only render outputs that can be rendered "safely"
 * (see [[RenderMime.IRenderer.isSafe]]) or can be "sanitized"
 * (see [[RenderMime.IRenderer.isSanitizable]]).
 */
export
class RenderMime {
  /**
   * Construct a renderer.
   */
  constructor(options: RenderMime.IOptions = {}) {
    if (options.items) {
      for (let item of options.items) {
        this._order.push(item.mimeType);
        this._renderers[item.mimeType] = item.renderer;
      }
    }
    this.sanitizer = options.sanitizer || defaultSanitizer;
    this._resolver = options.resolver || null;
    this._handler = options.linkHandler || null;
  }

  /**
   * The object used to resolve relative urls for the rendermime instance.
   */
  get resolver(): RenderMime.IResolver {
    return this._resolver;
  }
  set resolver(value: RenderMime.IResolver) {
    this._resolver = value;
  }

  /**
   * The object used to handle path opening links.
   */
  get linkHandler(): RenderMime.ILinkHandler {
    return this._handler;
  }
  set linkHandler(value: RenderMime.ILinkHandler) {
    this._handler = value;
  }

  /**
   * Get an iterator over the ordered list of mimeTypes.
   *
   * #### Notes
   * These mimeTypes are searched from beginning to end, and the first matching
   * mimeType is used.
   */
  mimeTypes(): IIterable<string> {
    return new ArrayIterator(this._order);
  }

  /**
   * Render a mime model.
   *
   * @param model - the mime model to render.
   *
   * #### Notes
   * Renders the model using the preferred mime type.  See
   * [[preferredMimeType]].
   */
  render(model: RenderMime.IMimeModel): Widget {
    let mimeType = this.preferredMimeType(model);
    if (!mimeType) {
      return this._handleError(model);
    }
    let rendererOptions = {
      mimeType,
      model,
      resolver: this._resolver,
      sanitizer: this.sanitizer,
      linkHandler: this._handler
    };
    return this._renderers[mimeType].render(rendererOptions);
  }

  /**
   * Find the preferred mimeType for a model.
   *
   * @param model - the mime model of interest.
   *
   * #### Notes
   * The mimeTypes in the model are checked in preference order
   * until a renderer returns `true` for `.canRender`.
   */
  preferredMimeType(model: RenderMime.IMimeModel): string {
    let sanitizer = this.sanitizer;
    return find(this._order, mimeType => {
      if (model.data.has(mimeType)) {
        let options = { mimeType, model, sanitizer };
        let renderer = this._renderers[mimeType];
        let canRender = false;
        try {
          canRender = renderer.canRender(options);
        } catch (err) {
          console.error(
            `Got an error when checking the renderer for the mimeType '${mimeType}'\n`, err);
        }
        if (canRender) {
          return true;
        }
      }
    });
  }

  /**
   * Clone the rendermime instance with shallow copies of data.
   *
   * #### Notes
   * The resolver is explicitly not cloned in this operation.
   */
  clone(): RenderMime {
    let items = toArray(map(this._order, mimeType => {
      return { mimeType, renderer: this._renderers[mimeType] };
    }));
    return new RenderMime({
      items,
      sanitizer: this.sanitizer,
      linkHandler: this._handler
    });
  }

  /**
   * Add a renderer by mimeType.
   *
   * @param item - A renderer item.
   *
   * @param index - The optional order index.
   *
   * ####Notes
   * Negative indices count from the end, so -1 refers to the last index.
   * Use the index of `.order.length` to add to the end of the render precedence list,
   * which would make the new renderer the last choice.
   * The renderer will replace an existing renderer for the given
   * mimeType.
   */
  addRenderer(item: RenderMime.IRendererItem, index = 0): void {
    let { mimeType, renderer } = item;
    let orig = ArrayExt.removeFirstOf(this._order, mimeType);
    if (orig !== -1 && orig < index) {
      index -= 1;
    }
    this._renderers[mimeType] = renderer;
    ArrayExt.insert(this._order, index, mimeType);
  }

  /**
   * Remove a renderer by mimeType.
   *
   * @param mimeType - The mimeType of the renderer.
   */
  removeRenderer(mimeType: string): void {
    delete this._renderers[mimeType];
    ArrayExt.removeFirstOf(this._order, mimeType);
  }

  /**
   * Get a renderer by mimeType.
   *
   * @param mimeType - The mimeType of the renderer.
   *
   * @returns The renderer for the given mimeType, or undefined if the mimeType is unknown.
   */
  getRenderer(mimeType: string): RenderMime.IRenderer {
    return this._renderers[mimeType];
  }

  /**
   * Return a widget for an error.
   */
  private _handleError(model: RenderMime.IMimeModel): Widget {
   let errModel = new MimeModel({
      data: {
        'application/vnd.jupyter.stderr': 'Unable to render data'
      }
   });
   let options = {
      mimeType: 'application/vnd.jupyter.stderr',
      model: errModel,
      sanitizer: this.sanitizer,
    };
   return new RenderedText(options);
  }

  readonly sanitizer: ISanitizer;

  private _renderers: { [key: string]: RenderMime.IRenderer } = Object.create(null);
  private _order: string[] = [];
  private _resolver: RenderMime.IResolver | null;
  private _handler: RenderMime.ILinkHandler | null;
}


/**
 * The namespace for RenderMime statics.
 */
export
namespace RenderMime {
  /**
   * The options used to initialize a rendermime instance.
   */
  export
  interface IOptions {
    /**
     * The intial renderer items.
     */
    items?: IRendererItem[];

    /**
     * The sanitizer used to sanitize untrusted html inputs.
     *
     * If not given, a default sanitizer will be used.
     */
    sanitizer?: ISanitizer;

    /**
     * The initial resolver object.
     *
     * The default is `null`.
     */
    resolver?: IResolver;

    /**
     * An optional path handler.
     */
    linkHandler?: ILinkHandler;
  }

  /**
   * A render item.
   */
  export
  interface IRendererItem {
    /**
     * The mimeType to be renderered.
     */
    mimeType: string;

    /**
     * The renderer.
     */
    renderer: IRenderer;
  }

  /**
   * An observable model for mime data.
   */
  export
  interface IMimeModel extends IDisposable {
    /**
     * Whether the model is trusted.
     */
    readonly trusted: boolean;

    /**
     * The data associated with the model.
     */
    readonly data: IObservableJSON;

    /**
     * The metadata associated with the model.
     */
    readonly metadata: IObservableJSON;

    /**
     * Serialize the model as JSON data.
     */
    toJSON(): JSONObject;
  }

  /**
   * Get an array of the default renderer items.
   */
  export
  function getDefaultItems(): IRendererItem[] {
    let renderers = Private.defaultRenderers;
    let items: IRendererItem[] = [];
    let mimes: { [key: string]: boolean } = {};
    for (let renderer of renderers) {
      for (let mime of renderer.mimeTypes) {
        if (mime in mimes) {
          continue;
        }
        mimes[mime] = true;
        items.push({ mimeType: mime, renderer });
      }
    }
    return items;
  }

  /**
   * The interface for a renderer.
   */
  export
  interface IRenderer {
    /**
     * The mimeTypes this renderer accepts.
     */
    readonly mimeTypes: string[];

    /**
     * Whether the renderer can render given the render options.
     *
     * @param options - The options that would be used to render the data.
     */
    canRender(options: IRenderOptions): boolean;

    /**
     * Render the transformed mime data.
     *
     * @param options - The options used to render the data.
     */
    render(options: IRenderOptions): Widget;

    /**
     * Whether the renderer will sanitize the data given the render options.
     *
     * @param options - The options that would be used to render the data.
     */
    wouldSanitize(options: IRenderOptions): boolean;
  }

  /**
   * The options used to transform or render mime data.
   */
  export
  interface IRenderOptions {
    /**
     * The preferred mimeType to render.
     */
    mimeType: string;

    /**
     * The mime data model.
     */
    model: IMimeModel;

    /**
     * The html sanitizer.
     */
    sanitizer: ISanitizer;

    /**
     * An optional url resolver.
     */
    resolver?: IResolver;

    /**
     * An optional link handler.
     */
    linkHandler?: ILinkHandler;
  }

  /**
   * An object that handles links on a node.
   */
  export
  interface ILinkHandler {
    /**
     * Add the link handler to the node.
     */
    handleLink(node: HTMLElement, url: string): void;
  }

  /**
   * An object that resolves relative URLs.
   */
  export
  interface IResolver {
    /**
     * Resolve a relative url to a correct server path.
     */
    resolveUrl(url: string): Promise<string>;

    /**
     * Get the download url of a given absolute server path.
     */
    getDownloadUrl(path: string): Promise<string>;
  }

  /**
   * A default resolver that uses a session and a contents manager.
   */
  export
  class UrlResolver implements IResolver {
    /**
     * Create a new url resolver for a console.
     */
    constructor(options: IUrlResolverOptions) {
      this._session = options.session;
      this._contents = options.contents;
    }

    /**
     * Resolve a relative url to a correct server path.
     */
    resolveUrl(url: string): Promise<string> {
      if (URLExt.isLocal(url)) {
        let cwd = PathExt.dirname(this._session.path);
        url = PathExt.resolve(cwd, url);
      }
      return Promise.resolve(url);
    }

    /**
     * Get the download url of a given absolute server path.
     */
    getDownloadUrl(path: string): Promise<string> {
      if (URLExt.isLocal(path)) {
        return this._contents.getDownloadUrl(path);
      }
      return Promise.resolve(path);
    }

    private _session: Session.ISession;
    private _contents: Contents.IManager;
  }

  /**
   * The options used to create a UrlResolver.
   */
  export
  interface IUrlResolverOptions {
    /**
     * The session used by the resolver.
     */
    session: Session.ISession;

    /**
     * The contents manager used by the resolver.
     */
    contents: Contents.IManager;
  }
}


/**
 * The namespace for private module data.
 */
export
namespace Private {
  /**
   * The default renderer instances.
   */
  export
  const defaultRenderers = [
    new JavaScriptRenderer(),
    new HTMLRenderer(),
    new MarkdownRenderer(),
    new LatexRenderer(),
    new SVGRenderer(),
    new ImageRenderer(),
    new PDFRenderer(),
    new TextRenderer()
  ];
}
