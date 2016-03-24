// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * The interface for a renderer.
 */
export
interface IRenderer<T> {
  /**
   * The function that will render a mimebundle.
   *
   * @param mimetype - the mimetype for the data
   * @param data - the data to render
   */
  render(mimetype: string, data: string): T;

  /**
   * The mimetypes this renderer accepts.
   */
  mimetypes: string[];
}


/**
 * A map of mimetypes to types.
 */
export
type MimeMap<T> = { [mimetype: string]: T };


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
class RenderMime<T> {
  /**
   * Construct a renderer.
   *
   * @param renderers - a map of mimetypes to renderers.
   * @param order - a list of mimetypes in order of precedence (earliest one has precedence).
   */
  constructor(renderers: MimeMap<IRenderer<T>> = {}, order: string[] = []) {
    this._renderers = renderers;
    this._order = order;
  }

  /**
   * Render a mimebundle.
   *
   * @param bundle - the mimebundle to render.
   */
  render(bundle: MimeMap<string>): T {
    let mimetype = this.preferredMimetype(bundle);
    if (mimetype) {
        return this.renderers[mimetype].render(mimetype, bundle[mimetype]);
    }
  }
  
  /**
   * Find the preferred mimetype in a mimebundle.
   *
   * @param bundle - the mimebundle giving available mimetype content.
   */
  preferredMimetype(bundle: MimeMap<string>): string {
    for (let m of this.order) {
      if (bundle.hasOwnProperty(m)) {
        return m;
      }
    }
  }
  
  /**
   * Get the renderer map.
   */
  get renderers() {
      return this._renderers;
  }
  
  /**
   * Get the ordered list of mimetypes.
   *
   * #### Notes
   * These mimetypes are searched from beginning to end, and the first matching
   * mimetype is used.
   */
  get order() {
      return this._order;
  }
  
  private _renderers: MimeMap<IRenderer<T>>;
  private _order: string[];
}
