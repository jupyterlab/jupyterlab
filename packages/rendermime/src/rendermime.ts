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
    this.resolver = options.resolver || null;
    this.linkHandler = options.linkHandler || null;
    let factories = options.initialFactories || [];
    for (let factory of factories) {
      for (let mime of factory.mimeTypes) {
        this._addFactory(factory, mime);
      }
    }
  }

  /**
   * The object used to resolve relative urls for the rendermime instance.
   */
  readonly resolver: IRenderMime.IResolver;

  /**
   * The object used to handle path opening links.
   */
  readonly linkHandler: IRenderMime.ILinkHandler;

  /**
   * The sanitizer used by the rendermime instance.
   */
  readonly sanitizer: ISanitizer;

  /**
   * The ordered list of mimeTypes.
   */
  get mimeTypes(): ReadonlyArray<string> {
    return this._mimeTypes;
  }

  /**
   * Create a renderer for a mime model.
   *
   * @param model - the mime model.
   *
   * @param mimeType - the optional explicit mimeType to use.
   *
   * #### Notes
   * If no mimeType is given, the [preferredMimeType] is used.
   */
  createRenderer(model: IRenderMime.IMimeModel, mimeType?: string): IRenderMime.IRenderer {
    mimeType = mimeType || this.preferredMimeType(model);
    let factory = this._factories[mimeType];
    if (!factory) {
      throw new Error('Cannot render model');
    }
    let options = {
      mimeType,
      trusted: model.trusted,
      resolver: this.resolver,
      sanitizer: this.sanitizer,
      linkHandler: this.linkHandler
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
   * #### Notes
   * The mimeTypes in the model are checked in preference order
   * until a renderer returns `true` for `.canCreateRenderer`.
   */
  preferredMimeType(model: IRenderMime.IMimeModel): string | undefined {
    let sanitizer = this.sanitizer;
    return find(this._mimeTypes, mimeType => {
      if (mimeType in model.data) {
        let options = { mimeType, sanitizer, trusted: model.trusted };
        let renderer = this._factories[mimeType];
        return renderer.canCreateRenderer(options);
      }
      return false;
    });
  }

  /**
   * Clone the rendermime instance with shallow copies of data.
   */
  clone(options: RenderMime.ICloneOptions = {}): RenderMime {
    let rendermime = new RenderMime({
      sanitizer: options.sanitizer || this.sanitizer,
      linkHandler: options.linkHandler || this.linkHandler,
      resolver: options.resolver || this.resolver
    });
    each(this._mimeTypes, mimeType => {
      let rank = this._ranks[mimeType];
      rendermime.addFactory(this._factories[mimeType], mimeType, rank);
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
   * @param rank - The rank of the renderer. Defaults to 100.
   *
   * #### Notes
   * The renderer will replace an existing renderer for the given
   * mimeType.
   */
  addFactory(factory: IRenderMime.IRendererFactory, mimeType: string, rank?: number): void {
    this._addFactory(factory, mimeType, rank);
  }

  /**
   * Remove a renderer factory by mimeType.
   *
   * @param mimeType - The mimeType of the factory.
   */
  removeFactory(mimeType: string): void {
    this._removeFactory(mimeType);
  }

  /**
   * Get a renderer factory by mimeType.
   *
   * @param mimeType - The mimeType of the renderer.
   *
   * @returns The renderer for the given mimeType, or undefined if the mimeType is unknown.
   */
  getFactory(mimeType: string): IRenderMime.IRendererFactory | undefined {
    return this._factories[mimeType];
  }

  /**
   * Add a factory to the rendermime instance.
   */
  private _addFactory(factory: IRenderMime.IRendererFactory, mimeType: string, rank = 100): void {
    // Remove any existing factory.
    if (mimeType in this._factories) {
      this._removeFactory(mimeType);
    }

    // Add the new factory in the correct order.
    this._ranks[mimeType] = rank;
    let index = ArrayExt.upperBound(
      this._mimeTypes, mimeType, (a, b) => {
        return this._ranks[a] - this._ranks[b];
    });
    ArrayExt.insert(this._mimeTypes, index, mimeType);
    this._factories[mimeType] = factory;
  }

  /**
   * Remove a renderer factory by mimeType.
   *
   * @param mimeType - The mimeType of the factory.
   */
  private _removeFactory(mimeType: string): void {
    delete this._factories[mimeType];
    delete this._ranks[mimeType];
    ArrayExt.removeFirstOf(this._mimeTypes, mimeType);
  }

  private _factories: { [key: string]: IRenderMime.IRendererFactory } = Object.create(null);
  private _mimeTypes: string[] = [];
  private _ranks: { [key: string]: number } = Object.create(null);
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
     * Intial factories to add to the rendermime instance.
     */
    initialFactories?: IRenderMime.IRendererFactory[];

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
   * Get the default factories.
   */
  export
  function getDefaultFactories(): IRenderMime.IRendererFactory[] {
    return [
      new JavaScriptRendererFactory(),
      new HTMLRendererFactory(),
      new MarkdownRendererFactory(),
      new LatexRendererFactory(),
      new SVGRendererFactory(),
      new ImageRendererFactory(),
      new PDFRendererFactory(),
      new TextRendererFactory()
    ];
  }

  /**
   * The options used to clone a rendermime instance.
   */
  export
  interface ICloneOptions {
    /**
     * The new sanitizer used to sanitize untrusted html inputs.
     */
    sanitizer?: IRenderMime.ISanitizer;

    /**
     * The new resolver object.
     */
    resolver?: IRenderMime.IResolver;

    /**
     * The new path handler.
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
}
