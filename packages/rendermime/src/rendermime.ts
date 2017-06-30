// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Contents, Session
} from '@jupyterlab/services';

import {
  ArrayExt, each, find
} from '@phosphor/algorithm';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import {
  PathExt, URLExt
} from '@jupyterlab/coreutils';

import {
  IClientSession, ISanitizer, defaultSanitizer
} from '@jupyterlab/apputils';

import {
  JavaScriptRendererFactory, HTMLRendererFactory, MarkdownRendererFactory,
  LatexRendererFactory, SVGRendererFactory, ImageRendererFactory,
  TextRendererFactory, PDFRendererFactory
} from './factories';


/**
 * A composite renderer.
 *
 * The renderer is used to render mime models using registered
 * mime renderers, selecting the preferred mime renderer to
 * render the model into a widget.
 */
export
class RenderMime {
  /**
   * Construct a renderer.
   */
  constructor(options: RenderMime.IOptions = {}) {
    this.sanitizer = options.sanitizer || defaultSanitizer;
    this._resolver = options.resolver || null;
    this._handler = options.linkHandler || null;
  }

  /**
   * The object used to resolve relative urls for the rendermime instance.
   */
  get resolver(): IRenderMime.IResolver {
    return this._resolver;
  }
  set resolver(value: IRenderMime.IResolver) {
    this._resolver = value;
  }

  /**
   * The object used to handle path opening links.
   */
  get linkHandler(): IRenderMime.ILinkHandler {
    return this._handler;
  }
  set linkHandler(value: IRenderMime.ILinkHandler) {
    this._handler = value;
  }

  /**
   * The sanitizer used by the rendermime instance.
   */
  readonly sanitizer: ISanitizer;

  /**
   * The ordered list of mimeTypes.
   */
  get mimeTypes(): ReadonlyArray<string> {
    return this._order;
  }

  /**
   * Create a renderer for a mime model.
   *
   * @param mimeType - the mime type to render.
   *
   * #### Notes
   * Creates a renderer widget using the preferred mime type.  See
   * [[preferredMimeType]].
   */
  createRenderer(mimeType: string, trusted: boolean): IRenderMime.IRendererWidget {
    let factory = this._factories[mimeType];
    if (!factory) {
      throw new Error(`Unregistered mimeType: ${mimeType}`);
    }
    let options = {
      mimeType,
      trusted,
      resolver: this._resolver,
      sanitizer: this.sanitizer,
      linkHandler: this._handler
    };
    if (!factory.canCreateRenderer(options)) {
      throw new Error('Cannot create renderer');
    }
    return factory.createRenderer(options);
  }

  /**
   * Find the preferred mimeType for a model.
   *
   * @param model - the mime model of interest.
   *
   * @param trusted - Whether the model is trusted.
   *
   * #### Notes
   * The mimeTypes in the model are checked in preference order
   * until a renderer returns `true` for `.canRender`.
   */
  preferredMimeType(model: IRenderMime.IMimeModel, trusted: boolean): string {
    let sanitizer = this.sanitizer;
    return find(this._order, mimeType => {
      if (model.data.has(mimeType)) {
        let options = { mimeType, sanitizer, trusted };
        let renderer = this._factories[mimeType];
        let canRender = false;
        try {
          canRender = renderer.canCreateRenderer(options);
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
    let rendermime = new RenderMime({
      sanitizer: this.sanitizer,
      linkHandler: this._handler
    });
    each(this._order, mimeType => {
      rendermime.addFactory(this._factories[mimeType], mimeType, -1);
    });
    return rendermime;
  }

  /**
   * Add a renderer factory for a given mimeType.
   *
   * @param factory - The renderer factory.
   *
   * @param mimeType - The renderer mimeType.
   *
   * @param index - The optional order index.  Defaults to the last index.
   *
   * #### Notes
   * Negative indices count from the end, so -1 adds the factory to the end
   * of the list.
   * The renderer will replace an existing renderer for the given
   * mimeType.
   */
  addFactory(factory: IRenderMime.IRendererFactory, mimeType: string, index = -1): void {
    let orig = ArrayExt.removeFirstOf(this._order, mimeType);
    if (orig !== -1 && orig < index) {
      index -= 1;
    }
    this._factories[mimeType] = factory;
    if (index < 0) {
      if (index === -1) {
        index = this._order.length;
      } else {
        index += 1;
      }
    }
    ArrayExt.insert(this._order, index, mimeType);
  }

  /**
   * Remove a renderer factory by mimeType.
   *
   * @param mimeType - The mimeType of the factory.
   */
  removeFactory(mimeType: string): void {
    delete this._factories[mimeType];
    ArrayExt.removeFirstOf(this._order, mimeType);
  }

  /**
   * Get a renderer factory by mimeType.
   *
   * @param mimeType - The mimeType of the renderer.
   *
   * @returns The renderer for the given mimeType, or undefined if the mimeType is unknown.
   */
  getFactory(mimeType: string): IRenderMime.IRendererFactory {
    return this._factories[mimeType];
  }

  private _factories: { [key: string]: IRenderMime.IRendererFactory } = Object.create(null);
  private _order: string[] = [];
  private _resolver: IRenderMime.IResolver | null;
  private _handler: IRenderMime.ILinkHandler | null;
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
     * The sanitizer used to sanitize untrusted html inputs.
     *
     * If not given, a default sanitizer will be used.
     */
    sanitizer?: IRenderMime.ISanitizer;

    /**
     * The initial resolver object.
     *
     * The default is `null`.
     */
    resolver?: IRenderMime.IResolver;

    /**
     * An optional path handler.
     */
    linkHandler?: IRenderMime.ILinkHandler;
  }

  /**
   * A default resolver that uses a session and a contents manager.
   */
  export
  class UrlResolver implements IRenderMime.IResolver {
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

    private _session: Session.ISession | IClientSession;
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
    session: Session.ISession | IClientSession;

    /**
     * The contents manager used by the resolver.
     */
    contents: Contents.IManager;
  }

  /**
   * Add the default renderer factories to a rendermime instance.
   */
  export
  function addDefaultFactories(rendermime: RenderMime): void {
    let renderers = [
      new JavaScriptRendererFactory(),
      new HTMLRendererFactory(),
      new MarkdownRendererFactory(),
      new LatexRendererFactory(),
      new SVGRendererFactory(),
      new ImageRendererFactory(),
      new PDFRendererFactory(),
      new TextRendererFactory()
    ];
    for (let renderer of renderers) {
      for (let mime of renderer.mimeTypes) {
        rendermime.addFactory(renderer, mime);
      }
    }
  }
}
