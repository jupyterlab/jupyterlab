// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Contents, ContentsManager, Session, utils
} from '@jupyterlab/services';

import {
  IIterable, IterableOrArrayLike
} from 'phosphor/lib/algorithm/iteration';

import {
  JSONValue
} from 'phosphor/lib/algorithm/json';

import {
  find
} from 'phosphor/lib/algorithm/searching';

import {
  Vector
} from 'phosphor/lib/collections/vector';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  IObservableMap
} from '../common/observablemap';

import {
  ISanitizer
} from '../common/sanitizer';

import {
  HTMLRenderer, LatexRenderer, ImageRenderer, TextRenderer,
  JavascriptRenderer, SVGRenderer, MarkdownRenderer, PDFRenderer
} from '../renderers';


/* tslint:disable */
/**
 * The rendermime token.
 */
export
const IRenderMime = new Token<IRenderMime>('jupyter.services.rendermime');
/* tslint:enable */


/**
 * The rendermime interface.
 */
export
interface IRenderMime extends RenderMime {}


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
  constructor(options: RenderMime.IOptions) {
    for (let mime in options.renderers) {
      this._renderers[mime] = options.renderers[mime];
    }
    this._order = new Vector(options.order);
    this._sanitizer = options.sanitizer;
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
    return this._order.iter();
  }

  /**
   * Render a mimebundle.
   *
   * @param bundle - the mimebundle to render.
   *
   * @param trusted - whether the bundle is trusted.
   *
   * #### Notes
   * We select the preferred mimeType in bundle based on whether the output is
   * trusted (see [[preferredmimeType]]), and then pass a sanitizer to the
   * renderer if the output should be sanitized.
   */
  render(options: RenderMime.IRenderOptions): Widget {
    let { trusted, bundle, injector } = options;
    let mimeType = this.preferredmimeType(bundle, trusted);
    if (!mimeType) {
      return void 0;
    }
    let rendererOptions = {
      mimeType,
      source: bundle[mimeType],
      injector,
      resolver: this._resolver,
      sanitizer: trusted ? null : this._sanitizer,
      linkHandler: this._handler
    };
    return this._renderers[mimeType].render(rendererOptions);
  }

  /**
   * Find the preferred mimeType in a mimebundle.
   *
   * @param bundle - the mimebundle giving available mimeType content.
   *
   * @param trusted - whether the bundle is trusted.
   *
   * #### Notes
   * For untrusted bundles, only select mimeTypes that can be rendered
   * "safely"  (see [[RenderMime.IRenderer.isSafe]]) or can  be "sanitized"
   * (see [[RenderMime.IRenderer.isSanitizable]]).
   */
  preferredMimeType(bundle: RenderMime.IMimeBundle): string {
    return find(this._order, m => {
      if (m in bundle) {
        let renderer = this._renderers[m];
        if (trusted || renderer.isSafe(m) || renderer.isSanitizable(m)) {
          return true;
        }
      }
    });
  }

  /**
   * Clone the rendermime instance with shallow copies of data.
   */
  clone(): IRenderMime {
    return new RenderMime({
      renderers: this._renderers,
      order: this._order.iter(),
      sanitizer: this._sanitizer,
      linkHandler: this._handler
    });
  }

  /**
   * Add a renderer by mimeType.
   *
   * @param mimeType - The mimeType of the renderer.
   * @param renderer - The renderer instance.
   * @param index - The optional order index.
   *
   * ####Notes
   * Negative indices count from the end, so -1 refers to the penultimate index.
   * Use the index of `.order.length` to add to the end of the render precedence list,
   * which would make the new renderer the last choice.
   */
  addRenderer(mimeType: string, renderer: RenderMime.IRenderer, index = 0): void {
    this._renderers[mimeType] = renderer;
    this._order.insert(index, mimeType);
  }

  /**
   * Remove a renderer by mimeType.
   *
   * @param mimeType - The mimeType of the renderer.
   */
  removeRenderer(mimeType: string): void {
    delete this._renderers[mimeType];
    this._order.remove(mimeType);
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

  private _renderers: RenderMime.MimeMap<RenderMime.IRenderer> = Object.create(null);
  private _order: Vector<string>;
  private _sanitizer: ISanitizer = null;
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
     * A map of mimeTypes to renderers.
     */
    renderers: MimeMap<IRenderer>;

    /**
     * A list of mimeTypes in order of precedence (earliest has precedence).
     */
    order: IterableOrArrayLike<string>;

    /**
     * The sanitizer used to sanitize html inputs.
     */
    sanitizer: ISanitizer;

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
   * Valid rendered object type.
   */
  export
  type RenderedObject = HTMLElement | Widget;

  /**
   * A map of mimetypes to types.
   */
  export
  type MimeMap<T> = { [mimetype: string]: T };

  /**
   * An observable bundle of mime data.
   */
  export
  interface IMimeBundle extends IObservableMap<JSONValue> {
    /**
     * Whether the bundle is trusted.
     */
    readonly trusted: boolean;

    /**
     * The metadata associated with the bundle.
     */
    readonly metadata: IObservableMap<JSONValue>;
  }

  /**
   * Default renderer order
   */
  export
  function defaultRenderers(): IRenderer[] {
    return [
      new JavascriptRenderer(),
      new HTMLRenderer(),
      new MarkdownRenderer(),
      new LatexRenderer(),
      new SVGRenderer(),
      new ImageRenderer(),
      new PDFRenderer(),
      new TextRenderer()
    ];
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
     * Whether the renderer can render the given mimeType in the bundle.
     *
     * @param mimeType - The deisred mimeType to render.
     *
     * @param bundle - The mime bundle to render.
     */
    canRender(mimeType: string, bundle: IMimeBundle): boolean;

    /**
     * Render the transformed mime bundle.
     *
     * @param options - The options used to render the bundle.
     */
    render(options: IRenderOptions): Widget;
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
     * The source data bundle.
     */
    bundle: IMimeBundle;

    /**
     * An optional url resolver.
     */
    resolver?: IResolver;

    /**
     * An optional html sanitizer.
     *
     * If given, should be used to sanitize raw html.
     */
    sanitizer?: ISanitizer;

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
      // Ignore urls that have a protocol.
      if (utils.urlParse(url).protocol || url.indexOf('//') === 0) {
        return Promise.resolve(url);
      }
      let path = this._session.path;
      let cwd = ContentsManager.dirname(path);
      path = ContentsManager.getAbsolutePath(url, cwd);
      return Promise.resolve(path);
    }

    /**
     * Get the download url of a given absolute server path.
     */
    getDownloadUrl(path: string): Promise<string> {
      // Ignore urls that have a protocol.
      if (utils.urlParse(path).protocol || path.indexOf('//') === 0) {
        return Promise.resolve(path);
      }
      return this._contents.getDownloadUrl(path);
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
