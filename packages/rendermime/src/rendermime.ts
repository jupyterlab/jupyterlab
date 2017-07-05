/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  Contents, Session
} from '@jupyterlab/services';

import {
  ArrayExt, find
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


/**
 * An object which manages mime renderer factories.
 *
 * This object is used to render mime models using registered mime
 * renderers, selecting the preferred mime renderer to render the
 * model into a widget.
 */
export
class RenderMime {
  /**
   * Construct a new rendermime.
   *
   * @param options - The options for initializing the instance.
   */
  constructor(options: RenderMime.IOptions = {}) {
    // Parse the options.
    this.resolver = options.resolver || null;
    this.linkHandler = options.linkHandler || null;
    this.sanitizer = options.sanitizer || defaultSanitizer;

    // Initialize the factory map.
    if (options.initialFactories) {
      for (let factory of options.initialFactories) {
        Private.addToMap(this._factories, factory, 100);
      }
    }
  }

  /**
   * The sanitizer used by the rendermime instance.
   */
  readonly sanitizer: ISanitizer;

  /**
   * The object used to resolve relative urls for the rendermime instance.
   */
  readonly resolver: IRenderMime.IResolver | null;

  /**
   * The object used to handle path opening links.
   */
  readonly linkHandler: IRenderMime.ILinkHandler | null;

  /**
   * The ordered list of mimeTypes.
   */
  get mimeTypes(): ReadonlyArray<string> {
    return this._types || (this._types = Private.sortedTypes(this._factories));
  }

  /**
   * Create a renderer for a mime type.
   *
   * @param mimeType - The mime type of interest.
   *
   * @returns A new renderer for the given mime type.
   *
   * @throws An error if no factory exists for the mime type.
   */
  createRenderer(mimeType: string): IRenderMime.IRenderer {
    // Throw an error if no factory exists for the mime type.
    if (!(mimeType in this._factories)) {
      throw new Error(`No factory for mime type: '${mimeType}'`);
    }

    // Create the renderer options for the factory.
    let options = {
      mimeType,
      resolver: this.resolver,
      sanitizer: this.sanitizer,
      linkHandler: this.linkHandler
    };

    // Invoke the best factory for the given mime type.
    return this._factories[mimeType][0].factory.createRenderer(options);
  }

  /**
   * Find the preferred mime type for a collection of types.
   *
   * @param types - The mime types from which to choose.
   *
   * @returns The preferred mime type from the available factories,
   *   or `undefined` if the mime type cannot be rendered.
   */
  preferredMimeType(types: string[]): string | undefined {
    return find(this.mimeTypes, mt => types.indexOf(mt) !== -1);
  }

  /**
   * Create a clone of this rendermime instance.
   *
   * @param options - The options for configuring the clone.
   *
   * @returns A new independent clone of the rendermime.
   */
  clone(options: RenderMime.ICloneOptions = {}): RenderMime {
    // Create the clone.
    let clone = new RenderMime({
      resolver: options.resolver || this.resolver,
      sanitizer: options.sanitizer || this.sanitizer,
      linkHandler: options.linkHandler || this.linkHandler
    });

    // Update the clone with a copy of the factory map.
    clone._factories = Private.cloneMap(this._factories);

    // Update the clone with a copy of the sorted types.
    clone._types = this.mimeTypes.slice();

    // Return the cloned object.
    return clone;
  }

  /**
   * Get the renderer factories registered for a mime type.
   *
   * @param mimeType - The mime type of interest.
   *
   * @returns A new array of the factories for the given mime type.
   */
  getFactories(mimeType: string): IRenderMime.IRendererFactory[] {
    let pairs = this._factories[mimeType];
    return pairs ? pairs.map(p => p.factory) : [];
  }

  /**
   * Add a renderer factory to the rendermime.
   *
   * @param factory - The renderer factory of interest.
   *
   * @param rank - The rank of the renderer. A lower rank indicates
   *   a higher priority for rendering. The default is `100`.
   *
   *
   * #### Notes
   * The renderer will replace an existing renderer for the given
   * mimeType.
   */
  addFactory(factory: IRenderMime.IRendererFactory, rank = 100): void {
    Private.addToMap(this._factories, factory, rank);
    this._types = null;
  }

  /**
   * Remove a specific renderer factory.
   *
   * @param factory - The renderer factory of interest.
   */
  removeFactory(factory: IRenderMime.IRendererFactory): void {
    Private.removeFromMap(this._factories, factory);
    this._types = null;
  }

  /**
   * Remove all renderer factories for a mime type.
   *
   * @param mimeType - The mime type of interest.
   */
  removeFactories(mimeType: string): void {
    delete this._factories[mimeType];
    this._types = null;
  }

  private _types: string[] | null = null;
  private _factories: Private.FactoryMap = {};
}


/**
 * The namespace for `RenderMime` class statics.
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


/**
 * The namespace for the module implementation details.
 */
namespace Private {
  /**
   * A pair which holds a rank and renderer factory.
   */
  export
  type FactoryPair = {
    readonly rank: number;
    readonly factory: IRenderMime.IRendererFactory;
  };

  /**
   * A type alias for a mapping of mime type -> ordered factories.
   */
  export
  type FactoryMap = { [key: string]: FactoryPair[] };

  /**
   * Add a factory to a factory map.
   *
   * This inserts the factory in each bucket according to rank.
   */
  export
  function addToMap(map: FactoryMap, factory: IRenderMime.IRendererFactory, rank: number): void {
    for (let key of factory.mimeTypes) {
      let pairs = map[key] || (map[key] = []);
      let i = ArrayExt.lowerBound(pairs, rank, rankCmp);
      ArrayExt.insert(pairs, i, { rank, factory });
    }
  }

  /**
   * Remove a factory from a factory map.
   *
   * This removes all instances of the factory from the map.
   *
   * Empty buckets are also removed.
   */
  export
  function removeFromMap(map: FactoryMap, factory: IRenderMime.IRendererFactory): void {
    for (let key in map) {
      let pairs = map[key];
      ArrayExt.removeAllWhere(pairs, pair => pair.factory === factory);
      if (pairs.length === 0) {
        delete map[key];
      }
    }
  }

  /**
   * Create a deep clone of a factory map.
   */
  export
  function cloneMap(map: FactoryMap): FactoryMap {
    let clone: FactoryMap = {};
    for (let key in map) {
      clone[key] = map[key].slice();
    }
    return clone;
  }

  /**
   * Get the mime types in the map, ordered by rank.
   */
  export
  function sortedTypes(map: FactoryMap): string[] {
    return Object.keys(map).sort((a, b) => map[a][0].rank - map[b][0].rank);
  }

  /**
   * A pair/rank comparison function.
   */
  function rankCmp(pair: FactoryPair, rank: number): number {
    return pair.rank - rank;
  }
}
