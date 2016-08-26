// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Token
} from 'phosphor/lib/core/token';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  ISanitizer
} from '../sanitizer';


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
 * When rendering a mimebundle, a mimetype is selected from the mimetypes by
 * searching through the `this.order` list. The first mimetype found in the bundle
 * determines the renderer that will be used.
 *
 * You can add a renderer by adding it to the `renderers` object and registering
 * the mimetype in the `order` array.
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
    this._order = options.order.slice();
    this._sanitizer = options.sanitizer;
    this._resolver = options.resolver || null;
  }

  /**
   * The ordered list of mimetypes.
   *
   * #### Notes
   * These mimetypes are searched from beginning to end, and the first matching
   * mimetype is used.
   */
  get order(): string[] {
    return this._order.slice();
  }
  set order(value: string[]) {
    this._order = value.slice();
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
   * Render a mimebundle.
   *
   * @param bundle - the mimebundle to render.
   *
   * @param trusted - whether the bundle is trusted.
   */
  render(bundle: RenderMime.MimeMap<string>, trusted=false): Widget {
    let mimetype = this.preferredMimetype(bundle, trusted);
    if (!mimetype) {
      return void 0;
    }
    let options = {
      mimetype,
      source: bundle[mimetype],
      resolver: this._resolver,
      sanitizer: trusted ? null : this._sanitizer
    };
    return this._renderers[mimetype].render(options);
  }

  /**
   * Find the preferred mimetype in a mimebundle.
   *
   * @param bundle - the mimebundle giving available mimetype content.
   *
   * @param trusted - whether the bundle is trusted.
   *
   * #### Notes
   * If the bundle is not trusted, the highest preference
   * mimetype that is sanitizable or safe will be chosen.
   */
  preferredMimetype(bundle: RenderMime.MimeMap<string>, trusted=false): string {
    for (let m of this.order) {
      if (m in bundle) {
        let renderer = this._renderers[m];
        if (trusted || renderer.isSafe(m) || renderer.isSanitizable(m)) {
          return m;
        }
      }
    }
  }

  /**
   * Clone the rendermime instance with shallow copies of data.
   */
  clone(): IRenderMime {
    return new RenderMime({
      renderers: this._renderers,
      order: this.order,
      sanitizer: this._sanitizer
    });
  }

  /**
   * Add a renderer by mimetype.
   *
   * @param mimetype - The mimetype of the renderer.
   * @param renderer - The renderer instance.
   * @param index - The optional order index.
   *
   * ####Notes
   * Negative indices count from the end, so -1 refers to the penultimate index.
   * Use the index of `.order.length` to add to the end of the render precedence list,
   * which would make the new renderer the last choice.
   */
  addRenderer(mimetype: string, renderer: RenderMime.IRenderer, index = 0): void {
    this._renderers[mimetype] = renderer;
    this._order.splice(index, 0, mimetype);
  }

  /**
   * Remove a renderer by mimetype.
   */
  removeRenderer(mimetype: string): void {
    delete this._renderers[mimetype];
    let index = this._order.indexOf(mimetype);
    if (index !== -1) {
      this._order.splice(index, 1);
    }
  }

  private _renderers: RenderMime.MimeMap<RenderMime.IRenderer> = Object.create(null);
  private _order: string[];
  private _sanitizer: ISanitizer = null;
  private _resolver: RenderMime.IResolver;
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
     * A map of mimetypes to renderers.
     */
    renderers: MimeMap<IRenderer>;

    /**
     * A list of mimetypes in order of precedence (earliest has precedence).
     */
    order: string[];

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
   * The interface for a renderer.
   */
  export
  interface IRenderer {
    /**
     * The mimetypes this renderer accepts.
     */
    mimetypes: string[];

    /**
     * Whether the input is safe without sanitization.
     *
     * #### Notes
     * A `safe` output is one that cannot pose a security threat
     * when added to the DOM, for example when it is set as `.textContent`.
     */
    isSafe(mimetype: string): boolean;

    /**
     * Whether the input can safely sanitized for a given mimetype.
     *
     * #### Notes
     * A `santizable` output is one that could pose a security threat
     * if not properly sanitized, but can be passed through an html sanitizer
     * to render it safe.
     */
    isSanitizable(mimetype: string): boolean;

    /**
     * Render the transformed mime bundle.
     *
     * @param options - The options used for rendering.
     */
    render(options: IRenderOptions): Widget;
  }

  /**
   * The options used to transform or render mime data.
   */
  export
  interface IRenderOptions {
    /**
     * The mimetype.
     */
    mimetype: string;

    /**
     * The source data.
     */
    source: string;

    /**
     * An optional url resolver.
     */
    resolver?: IResolver;

    /**
     * An optional html santizer.
     *
     * If given, should be used to sanitize raw html.
     */
    sanitizer?: ISanitizer;
  }

  /**
   * An object that resolves relative URLs.
   */
  export
  interface IResolver {
    /**
     * Resolve a url to a correct server path.
     */
    resolveUrl(url: string): string;
  }
}
