// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from 'phosphor-widget';

import {
  ISanitizer, defaultSanitizer
} from '../sanitizer';


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
class RenderMime<T extends RenderMime.RenderedObject> {
  /**
   * Construct a renderer.
   */
  constructor(options: RenderMime.IOptions<T>) {
    for (let mime in options.renderers) {
      this._renderers[mime] = options.renderers[mime];
    }
    this._order = options.order.slice();
    this._sanitizer = options.sanitizer || defaultSanitizer;
  }

  /**
   * Render a mimebundle.
   *
   * @param bundle - the mimebundle to render.
   *
   * @param trusted - whether the bundle is trusted.
   */
  render(bundle: RenderMime.MimeMap<string>, trusted=false): Promise<T> {
    let mimetype = this.preferredMimetype(bundle, trusted);
    if (!mimetype) {
      return Promise.resolve(void 0);
    }
    let renderer = this._renderers[mimetype];
    let transform = renderer.transform(mimetype, bundle[mimetype]);
    return Promise.resolve(transform).then(content => {
      if (!trusted && renderer.sanitizable(mimetype)) {
        content = this._sanitizer.sanitize(content);
      }
      return renderer.render(content, content);
    });
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
        if (trusted || renderer.isSafe(m) || renderer.sanitizable(m)) {
          return m;
        }
      }
    }
  }

  /**
   * Clone the rendermime instance with shallow copies of data.
   */
  clone(): RenderMime<T> {
    return new RenderMime<T>({
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
  addRenderer(mimetype: string, renderer: RenderMime.IRenderer<T>, index = 0): void {
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

  /**
   * Get the ordered list of mimetypes.
   *
   * #### Notes
   * These mimetypes are searched from beginning to end, and the first matching
   * mimetype is used.
   */
  get order() {
    return this._order.slice();
  }

  /**
   * Set the ordered list of mimetypes.
   */
  set order(value: string[]) {
    this._order = value.slice();
  }

  private _renderers: RenderMime.MimeMap<RenderMime.IRenderer<T>> = Object.create(null);
  private _order: string[];
  private _sanitizer: ISanitizer = null;
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
  interface IOptions<T extends RenderedObject> {
    /**
     * A map of mimetypes to renderers.
     */
    renderers: MimeMap<IRenderer<T>>;

    /**
     * A list of mimetypes in order of precedence (earliest has precedence).
     */
    order: string[];

    /**
     * The sanitizer used to sanitize html inputs.
     *
     * The default is a shared
     */
    sanitizer?: ISanitizer;
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
  interface IRenderer<T extends RenderedObject> {
    /**
     * The mimetypes this renderer accepts.
     */
    mimetypes: string[];

    /**
     * Whether the input is safe without sanitization.
     */
    isSafe(mimetype: string): boolean;

    /**
     * Whether the input can safely sanitized for a given mimetype.
     */
    sanitizable(mimetype: string): boolean;

    /**
     * Transform the input bundle.
     */
    transform(mimetype: string, data: string): string | Promise<string>;

    /**
     * Render the transformed mime bundle.
     *
     * @param mimetype - the mimetype for the data
     *
     * @param data - the data to render.
     *
     * #### Notes
     * It is assumed that the data has been run through [[transform]]
     * and has been sanitized if necessary.
     */
    render(mimetype: string, data: string): T;
  }
}
