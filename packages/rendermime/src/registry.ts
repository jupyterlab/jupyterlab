/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import { Sanitizer } from '@jupyterlab/apputils';
import { PageConfig, PathExt, URLExt } from '@jupyterlab/coreutils';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { Contents } from '@jupyterlab/services';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { MimeModel } from './mimemodel';
import { IRenderMimeRegistry } from './tokens';

/**
 * An object which manages mime renderer factories.
 *
 * This object is used to render mime models using registered mime
 * renderers, selecting the preferred mime renderer to render the
 * model into a widget.
 *
 * #### Notes
 * This class is not intended to be subclassed.
 */
export class RenderMimeRegistry implements IRenderMimeRegistry {
  /**
   * Construct a new rendermime.
   *
   * @param options - The options for initializing the instance.
   */
  constructor(options: RenderMimeRegistry.IOptions = {}) {
    // Parse the options.
    this.translator = options.translator ?? nullTranslator;
    this.resolver = options.resolver ?? null;
    this.linkHandler = options.linkHandler ?? null;
    this.latexTypesetter = options.latexTypesetter ?? null;
    this.markdownParser = options.markdownParser ?? null;
    this.sanitizer = options.sanitizer ?? new Sanitizer();

    // Add the initial factories.
    if (options.initialFactories) {
      for (const factory of options.initialFactories) {
        this.addFactory(factory);
      }
    }
  }

  /**
   * The sanitizer used by the rendermime instance.
   */
  readonly sanitizer: IRenderMime.ISanitizer;

  /**
   * The object used to resolve relative urls for the rendermime instance.
   */
  readonly resolver: IRenderMime.IResolver | null;

  /**
   * The object used to handle path opening links.
   */
  readonly linkHandler: IRenderMime.ILinkHandler | null;

  /**
   * The LaTeX typesetter for the rendermime.
   */
  readonly latexTypesetter: IRenderMime.ILatexTypesetter | null;

  /**
   * The Markdown parser for the rendermime.
   */
  readonly markdownParser: IRenderMime.IMarkdownParser | null;

  /**
   * The application language translator.
   */
  readonly translator: ITranslator;

  /**
   * The ordered list of mimeTypes.
   */
  get mimeTypes(): ReadonlyArray<string> {
    return this._types || (this._types = Private.sortedTypes(this._ranks));
  }

  /**
   * Find the preferred mime type for a mime bundle.
   *
   * @param bundle - The bundle of mime data.
   *
   * @param safe - How to consider safe/unsafe factories. If 'ensure',
   *   it will only consider safe factories. If 'any', any factory will be
   *   considered. If 'prefer', unsafe factories will be considered, but
   *   only after the safe options have been exhausted.
   *
   * @returns The preferred mime type from the available factories,
   *   or `undefined` if the mime type cannot be rendered.
   */
  preferredMimeType(
    bundle: ReadonlyPartialJSONObject,
    safe: 'ensure' | 'prefer' | 'any' = 'ensure'
  ): string | undefined {
    // Try to find a safe factory first, if preferred.
    if (safe === 'ensure' || safe === 'prefer') {
      for (const mt of this.mimeTypes) {
        if (mt in bundle && this._factories[mt].safe) {
          return mt;
        }
      }
    }

    if (safe !== 'ensure') {
      // Otherwise, search for the best factory among all factories.
      for (const mt of this.mimeTypes) {
        if (mt in bundle) {
          return mt;
        }
      }
    }

    // Otherwise, no matching mime type exists.
    return undefined;
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

    // Invoke the best factory for the given mime type.
    return this._factories[mimeType].createRenderer({
      mimeType,
      resolver: this.resolver,
      sanitizer: this.sanitizer,
      linkHandler: this.linkHandler,
      latexTypesetter: this.latexTypesetter,
      markdownParser: this.markdownParser,
      translator: this.translator
    });
  }

  /**
   * Create a new mime model.  This is a convenience method.
   *
   * @options - The options used to create the model.
   *
   * @returns A new mime model.
   */
  createModel(options: MimeModel.IOptions = {}): MimeModel {
    return new MimeModel(options);
  }

  /**
   * Create a clone of this rendermime instance.
   *
   * @param options - The options for configuring the clone.
   *
   * @returns A new independent clone of the rendermime.
   */
  clone(options: IRenderMimeRegistry.ICloneOptions = {}): RenderMimeRegistry {
    // Create the clone.
    const clone = new RenderMimeRegistry({
      resolver: options.resolver ?? this.resolver ?? undefined,
      sanitizer: options.sanitizer ?? this.sanitizer ?? undefined,
      linkHandler: options.linkHandler ?? this.linkHandler ?? undefined,
      latexTypesetter:
        options.latexTypesetter ?? this.latexTypesetter ?? undefined,
      markdownParser:
        options.markdownParser ?? this.markdownParser ?? undefined,
      translator: this.translator
    });

    // Clone the internal state.
    clone._factories = { ...this._factories };
    clone._ranks = { ...this._ranks };
    clone._id = this._id;

    // Return the cloned object.
    return clone;
  }

  /**
   * Get the renderer factory registered for a mime type.
   *
   * @param mimeType - The mime type of interest.
   *
   * @returns The factory for the mime type, or `undefined`.
   */
  getFactory(mimeType: string): IRenderMime.IRendererFactory | undefined {
    return this._factories[mimeType];
  }

  /**
   * Add a renderer factory to the rendermime.
   *
   * @param factory - The renderer factory of interest.
   *
   * @param rank - The rank of the renderer. A lower rank indicates
   *   a higher priority for rendering. If not given, the rank will
   *   defer to the `defaultRank` of the factory.  If no `defaultRank`
   *   is given, it will default to 100.
   *
   * #### Notes
   * The renderer will replace an existing renderer for the given
   * mimeType.
   */
  addFactory(factory: IRenderMime.IRendererFactory, rank?: number): void {
    if (rank === undefined) {
      rank = factory.defaultRank;
      if (rank === undefined) {
        rank = 100;
      }
    }
    for (const mt of factory.mimeTypes) {
      this._factories[mt] = factory;
      this._ranks[mt] = { rank, id: this._id++ };
    }
    this._types = null;
  }

  /**
   * Remove a mime type.
   *
   * @param mimeType - The mime type of interest.
   */
  removeMimeType(mimeType: string): void {
    delete this._factories[mimeType];
    delete this._ranks[mimeType];
    this._types = null;
  }

  /**
   * Get the rank for a given mime type.
   *
   * @param mimeType - The mime type of interest.
   *
   * @returns The rank of the mime type or undefined.
   */
  getRank(mimeType: string): number | undefined {
    const rank = this._ranks[mimeType];
    return rank && rank.rank;
  }

  /**
   * Set the rank of a given mime type.
   *
   * @param mimeType - The mime type of interest.
   *
   * @param rank - The new rank to assign.
   *
   * #### Notes
   * This is a no-op if the mime type is not registered.
   */
  setRank(mimeType: string, rank: number): void {
    if (!this._ranks[mimeType]) {
      return;
    }
    const id = this._id++;
    this._ranks[mimeType] = { rank, id };
    this._types = null;
  }

  private _id = 0;
  private _ranks: Private.RankMap = {};
  private _types: string[] | null = null;
  private _factories: Private.FactoryMap = {};
}

/**
 * The namespace for `RenderMimeRegistry` class statics.
 */
export namespace RenderMimeRegistry {
  /**
   * The options used to initialize a rendermime instance.
   */
  export interface IOptions {
    /**
     * Initial factories to add to the rendermime instance.
     */
    initialFactories?: ReadonlyArray<IRenderMime.IRendererFactory>;

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

    /**
     * An optional LaTeX typesetter.
     */
    latexTypesetter?: IRenderMime.ILatexTypesetter;

    /**
     * An optional Markdown parser.
     */
    markdownParser?: IRenderMime.IMarkdownParser;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }

  /**
   * A default resolver that uses a given reference path and a contents manager.
   */
  export class UrlResolver implements IRenderMime.IResolver {
    /**
     * Create a new url resolver.
     */
    constructor(options: IUrlResolverOptions) {
      this._path = options.path;
      this._contents = options.contents;
    }

    /**
     * The path of the object, from which local urls can be derived.
     */
    get path(): string {
      return this._path;
    }
    set path(value: string) {
      this._path = value;
    }

    /**
     * Resolve a relative url to an absolute url path.
     */
    async resolveUrl(url: string): Promise<string> {
      if (this.isLocal(url)) {
        const cwd = encodeURI(PathExt.dirname(this.path));
        url = PathExt.resolve(cwd, url);
      }
      return url;
    }

    /**
     * Get the download url of a given absolute url path.
     *
     * #### Notes
     * The returned URL may include a query parameter.
     */
    async getDownloadUrl(urlPath: string): Promise<string> {
      if (this.isLocal(urlPath)) {
        // decode url->path before passing to contents api
        return this._contents.getDownloadUrl(decodeURIComponent(urlPath));
      }
      return urlPath;
    }

    /**
     * Whether the URL should be handled by the resolver
     * or not.
     *
     * @param allowRoot - Whether the paths starting at Unix-style filesystem root (`/`) are permitted.
     *
     * #### Notes
     * This is similar to the `isLocal` check in `URLExt`,
     * but it also checks whether the path points to any
     * of the `IDrive`s that may be registered with the contents
     * manager.
     */
    isLocal(url: string, allowRoot: boolean = false): boolean {
      if (this.isMalformed(url)) {
        return false;
      }
      return (
        URLExt.isLocal(url, allowRoot) ||
        !!this._contents.driveName(decodeURI(url))
      );
    }

    /**
     * Resolve a path from Jupyter kernel to a path:
     * - relative to `root_dir` (preferably) this is in jupyter-server scope,
     * - path understood and known by kernel (if such a path exists).
     * Returns `null` if there is no file matching provided path in neither
     * kernel nor jupyter-server contents manager.
     */
    async resolvePath(
      path: string
    ): Promise<IRenderMime.IResolvedLocation | null> {
      // TODO: a clean implementation would be server-side and depends on:
      // https://github.com/jupyter-server/jupyter_server/issues/1280

      const rootDir = PageConfig.getOption('rootUri').replace('file://', '');
      // Workaround: expand `~` path using root dir (if it matches).
      if (path.startsWith('~/') && rootDir.startsWith('/home/')) {
        // For now we assume that kernel is in root dir.
        path = rootDir.split('/').slice(0, 3).join('/') + path.substring(1);
      }
      if (path.startsWith(rootDir) || path.startsWith('./')) {
        try {
          const relativePath = path.replace(rootDir, '');
          // If file exists on the server we have guessed right
          const response = await this._contents.get(relativePath, {
            content: false
          });
          return {
            path: response.path,
            scope: 'server'
          };
        } catch (error) {
          // The file seems like should be on the server but is not.
          console.warn(`Could not resolve location of ${path} on server`);
          return null;
        }
      }
      // The file is not accessible from jupyter-server but maybe it is
      // available from DAP `source`; we assume the path is available
      // from kernel because currently we have no way of checking this
      // without introducing a cycle (unless we were to set the debugger
      // service instance on the resolver later).
      return {
        path: path,
        scope: 'kernel'
      };
    }

    /**
     * Whether the URL can be decoded using `decodeURI`.
     */
    isMalformed(url: string): boolean {
      try {
        decodeURI(url);
        return false;
      } catch (error: unknown) {
        if (error instanceof URIError) {
          return true;
        }
        throw error;
      }
    }

    private _path: string;
    private _contents: Contents.IManager;
  }

  /**
   * The options used to create a UrlResolver.
   */
  export interface IUrlResolverOptions {
    /**
     * The path providing context for local urls.
     *
     * #### Notes
     * Either session or path must be given, and path takes precedence.
     */
    path: string;

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
   * A type alias for a mime rank and tie-breaking id.
   */
  export type RankPair = { readonly id: number; readonly rank: number };

  /**
   * A type alias for a mapping of mime type -> rank pair.
   */
  export type RankMap = { [key: string]: RankPair };

  /**
   * A type alias for a mapping of mime type -> ordered factories.
   */
  export type FactoryMap = { [key: string]: IRenderMime.IRendererFactory };

  /**
   * Get the mime types in the map, ordered by rank.
   */
  export function sortedTypes(map: RankMap): string[] {
    return Object.keys(map).sort((a, b) => {
      const p1 = map[a];
      const p2 = map[b];
      if (p1.rank !== p2.rank) {
        return p1.rank - p2.rank;
      }
      return p1.id - p2.id;
    });
  }
}
