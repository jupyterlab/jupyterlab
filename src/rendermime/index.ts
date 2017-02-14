// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Contents, ContentsManager, Session, nbformat, utils
} from '@jupyterlab/services';

import {
  IIterable, IterableOrArrayLike
} from 'phosphor/lib/algorithm/iteration';

import {
  JSONObject, JSONValue
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
  IObservableMap, ObservableMap
} from '../common/observablemap';

import {
  ISanitizer, defaultSanitizer
} from '../common/sanitizer';

import {
  HTMLRenderer, LatexRenderer, ImageRenderer, TextRenderer,
  JavaScriptRenderer, SVGRenderer, MarkdownRenderer, PDFRenderer
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
    this._sanitizer = options.sanitizer || defaultSanitizer;
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
  render(bundle: RenderMime.IMimeBundle): Widget {
    let mimeType = this.preferredMimeType(bundle);
    if (!mimeType) {
      return void 0;
    }
    let rendererOptions = {
      mimeType,
      bundle,
      resolver: this._resolver,
      sanitizer: this._sanitizer,
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
    let sanitizer = this._sanitizer;
    return find(this._order, mimeType => {
      if (mimeType in bundle.keys()) {
        let options = { mimeType, bundle, sanitizer };
        let renderer = this._renderers[mimeType];
        if (renderer.canRender(options)) {
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
  private _sanitizer: ISanitizer;
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
   * The mimeType for Jupyter console text.
   */
  export
  const CONSOLE_MIMETYPE: string = 'application/vnd.jupyter.console-text';

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
   * The default mime bundle implementation.
   */
  export
  class MimeBundle extends ObservableMap<JSONValue> implements IMimeBundle {
    /**
     * Construct a new mime bundle.
     */
    constructor(options: IMimeBundleOptions) {
      super();
      this.trusted = options.trusted;
      let data = options.data;
      let metadata: JSONObject = options.metadata || Object.create(null);
      for (let key in data) {
        this.set(key, data[key]);
      }
      for (let key in metadata) {
        this._metadata.set(key, metadata[key]);
      }
    }

    /**
     * Whether the bundle is trusted.
     */
    readonly trusted: boolean;

    /**
     * Dispose of the resources used by the mime bundle.
     */
    dispose(): void {
      this._metadata.dispose();
      super.dispose();
    }

    /**
     * The metadata associated with the bundle.
     */
    get metadata(): IObservableMap<JSONValue> {
      return this._metadata;
    }

    private _metadata = new ObservableMap<JSONValue>();
  }

  /**
   * The options used to create a mime bundle.
   */
  export
  interface IMimeBundleOptions {
    /**
     * The raw mime data.
     */
    data: JSONObject;

    /**
     * Whether the output is trusted.
     */
    trusted: boolean;

    /**
     * The raw metadata, if applicable.
     */
    metadata?: JSONObject;
  }

  /**
   * Get the data for an output.
   *
   * @params output - A kernel output message payload.
   *
   * @returns - The data for the payload.
   */
  export
  function getData(output: nbformat.IOutput): JSONObject {
    return Private.getData(output);
  }

  /**
   * Get the metadata from an output message.
   */
  export
  function getMetadata(output: nbformat.IOutput): JSONObject {
    switch (output.output_type) {
    case 'execute_result':
    case 'display_data':
      return (output as nbformat.IDisplayData).metadata;
    default:
      break;
    }
    return Object.create(null);
  }

  /**
   * Default renderer order
   */
  export
  function defaultRenderers(): IRenderer[] {
    return [
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
     * @param options - The options that would be used to render the bundle.
     */
    canRender(options: IRenderOptions): boolean;

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


/**
 * The namespace for module private data.
 */
 namespace Private {
  /**
   * Get the data from a notebook output.
   */
  export
  function getData(output: nbformat.IOutput): JSONObject {
    let bundle: nbformat.IMimeBundle;
    switch (output.output_type) {
    case 'execute_result':
      bundle = (output as nbformat.IExecuteResult).data;
      break;
    case 'display_data':
      bundle = (output as nbformat.IDisplayData).data;
      break;
    case 'stream':
      let text = (output as nbformat.IStream).text;
      bundle[RenderMime.CONSOLE_MIMETYPE] = text;
      break;
    case 'error':
      let out: nbformat.IError = output as nbformat.IError;
      let traceback = out.traceback.join('\n');
      bundle[RenderMime.CONSOLE_MIMETYPE] = (
        traceback || `${out.ename}: ${out.evalue}`
      );
      break;
    default:
      break;
    }
    return convertBundle(bundle || {});
  }

  /**
   * Convert a mime bundle to mime data.
   */
  function convertBundle(bundle: nbformat.IMimeBundle): JSONObject {
    let map: JSONObject = Object.create(null);
    for (let mimeType in bundle) {
      let value = bundle[mimeType];
      if (Array.isArray(value)) {
        map[mimeType] = (value as string[]).join('\n');
      } else {
        map[mimeType] = value as string;
      }
    }
    return map;
  }
 }
