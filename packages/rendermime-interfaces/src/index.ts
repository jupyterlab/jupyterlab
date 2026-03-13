/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module rendermime-interfaces
 */

import type { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import type { Widget } from '@lumino/widgets';

/**
 * A namespace for rendermime associated interfaces.
 */
export namespace IRenderMime {
  /**
   * A model for mime data.
   */
  export interface IMimeModel {
    /**
     * Whether the data in the model is trusted.
     */
    readonly trusted: boolean;

    /**
     * The data associated with the model.
     */
    readonly data: ReadonlyPartialJSONObject;

    /**
     * The metadata associated with the model.
     *
     * Among others, it can include an attribute named `fragment`
     * that stores a URI fragment identifier for the MIME resource.
     */
    readonly metadata: ReadonlyPartialJSONObject;

    /**
     * Set the data associated with the model.
     *
     * #### Notes
     * Calling this function may trigger an asynchronous operation
     * that could cause the renderer to be rendered with a new model
     * containing the new data.
     */
    setData(options: IMimeModel.ISetDataOptions): void;
  }

  /**
   * The namespace for IMimeModel associated interfaces.
   */
  export namespace IMimeModel {
    /**
     * The options used to update a mime model.
     */
    export interface ISetDataOptions {
      /**
       * The new data object.
       */
      data?: ReadonlyPartialJSONObject;

      /**
       * The new metadata object.
       */
      metadata?: ReadonlyPartialJSONObject;
    }
  }

  /**
   * A toolbar item.
   */
  export interface IToolbarItem {
    /**
     * Unique item name
     */
    name: string;
    /**
     * Toolbar widget
     */
    widget: Widget;
  }

  /**
   * The options used to initialize a document widget factory.
   *
   * This interface is intended to be used by mime renderer extensions
   * to define a document opener that uses its renderer factory.
   */
  export interface IDocumentWidgetFactoryOptions {
    /**
     * The name of the widget to display in dialogs.
     */
    readonly name: string;

    /**
     * The label of the widget to display in dialogs.
     * If not given, name is used instead.
     */
    readonly label?: string;

    /**
     * The name of the document model type.
     */
    readonly modelName?: string;

    /**
     * The primary file type of the widget.
     */
    readonly primaryFileType: string;

    /**
     * The file types the widget can view.
     */
    readonly fileTypes: ReadonlyArray<string>;

    /**
     * The file types for which the factory should be the default.
     */
    readonly defaultFor?: ReadonlyArray<string>;

    /**
     * The file types for which the factory should be the default for rendering,
     * if that is different than the default factory (which may be for editing)
     * If undefined, then it will fall back on the default file type.
     */
    readonly defaultRendered?: ReadonlyArray<string>;

    /**
     * The application language translator.
     */
    readonly translator?: ITranslator;

    /**
     * A function returning a list of toolbar items to add to the toolbar.
     */
    readonly toolbarFactory?: (widget?: Widget) => IToolbarItem[];
  }

  export namespace LabIcon {
    /**
     * The simplest possible interface for defining a generic icon.
     */
    export interface IIcon {
      /**
       * The name of the icon. By convention, the icon name will be namespaced
       * as so:
       *
       *     "pkg-name:icon-name"
       */
      readonly name: string;

      /**
       * A string containing the raw contents of an svg file.
       */
      svgstr: string;
    }

    /**
     * Interface for generic renderer.
     */
    export interface IRenderer {
      readonly render: (container: HTMLElement, options?: any) => void;
      readonly unrender?: (container: HTMLElement, options?: any) => void;
    }

    /**
     * A type that can be resolved to a LabIcon instance.
     */
    export type IResolvable = string | (IIcon & Partial<IRenderer>);
  }

  /**
   * A file type to associate with the renderer.
   */
  export interface IFileType {
    /**
     * The name of the file type.
     */
    readonly name: string;

    /**
     * The mime types associated the file type.
     */
    readonly mimeTypes: ReadonlyArray<string>;

    /**
     * The extensions of the file type (e.g. `".txt"`).  Can be a compound
     * extension (e.g. `".table.json`).
     */
    readonly extensions: ReadonlyArray<string>;

    /**
     * An optional display name for the file type.
     */
    readonly displayName?: string;

    /**
     * An optional pattern for a file name (e.g. `^Dockerfile$`).
     */
    readonly pattern?: string;

    /**
     * The icon for the file type. Can either be a string containing the name
     * of an existing icon, or an object with \{name, svgstr\} fields, where
     * svgstr is a string containing the raw contents of an svg file.
     */
    readonly icon?: LabIcon.IResolvable;

    /**
     * The icon class name for the file type.
     */
    readonly iconClass?: string;

    /**
     * The icon label for the file type.
     */
    readonly iconLabel?: string;

    /**
     * The file format for the file type ('text', 'base64', or 'json').
     */
    readonly fileFormat?: string | null;
  }

  /**
   * An interface for using a RenderMime.IRenderer for output and read-only documents.
   */
  export interface IExtension {
    /**
     * The ID of the extension.
     *
     * #### Notes
     * The convention for extension IDs in JupyterLab is the full NPM package
     * name followed by a colon and a unique string token, e.g.
     * `'@jupyterlab/apputils-extension:settings'` or `'foo-extension:bar'`.
     */
    readonly id: string;

    /**
     * Extension description.
     *
     * #### Notes
     * This can be used to provide user documentation on the feature
     * brought by the extension.
     */
    readonly description?: string;

    /**
     * A renderer factory to be registered to render the MIME type.
     */
    readonly rendererFactory: IRendererFactory;

    /**
     * The rank passed to `RenderMime.addFactory`.  If not given,
     * defaults to the `defaultRank` of the factory.
     */
    readonly rank?: number;

    /**
     * The timeout after user activity to re-render the data.
     */
    readonly renderTimeout?: number;

    /**
     * Preferred data type from the model.  Defaults to `string`.
     */
    readonly dataType?: 'string' | 'json';

    /**
     * The options used to open a document with the renderer factory.
     */
    readonly documentWidgetFactoryOptions?:
      | IDocumentWidgetFactoryOptions
      | ReadonlyArray<IDocumentWidgetFactoryOptions>;

    /**
     * The optional file type associated with the extension.
     */
    readonly fileTypes?: ReadonlyArray<IFileType>;
  }

  /**
   * The interface for a module that exports an extension or extensions as
   * the default value.
   */
  export interface IExtensionModule {
    /**
     * The default export.
     */
    readonly default: IExtension | ReadonlyArray<IExtension>;
  }

  /**
   * A widget which displays the contents of a mime model.
   */
  export interface IRenderer extends Widget {
    /**
     * Render a mime model.
     *
     * @param model - The mime model to render.
     *
     * @returns A promise which resolves when rendering is complete.
     *
     * #### Notes
     * This method may be called multiple times during the lifetime
     * of the widget to update it if and when new data is available.
     */
    renderModel(model: IMimeModel): Promise<void>;
  }

  /**
   * The interface for a renderer factory.
   */
  export interface IRendererFactory {
    /**
     * Whether the factory is a "safe" factory.
     *
     * #### Notes
     * A "safe" factory produces renderer widgets which can render
     * untrusted model data in a usable way. *All* renderers must
     * handle untrusted data safely, but some may simply failover
     * with a "Run cell to view output" message. A "safe" renderer
     * is an indication that its sanitized output will be useful.
     */
    readonly safe: boolean;

    /**
     * The mime types handled by this factory.
     */
    readonly mimeTypes: ReadonlyArray<string>;

    /**
     * The default rank of the factory.  If not given, defaults to 100.
     */
    readonly defaultRank?: number;

    /**
     * Create a renderer which displays the mime data.
     *
     * @param options - The options used to render the data.
     */
    createRenderer(options: IRendererOptions): IRenderer;
  }

  /**
   * The options used to create a renderer.
   */
  export interface IRendererOptions {
    /**
     * The preferred mimeType to render.
     */
    mimeType: string;

    /**
     * The html sanitizer.
     */
    sanitizer: ISanitizer;

    /**
     * An optional url resolver.
     */
    resolver: IResolver | null;

    /**
     * An optional link handler.
     */
    linkHandler: ILinkHandler | null;

    /**
     * The LaTeX typesetter.
     */
    latexTypesetter: ILatexTypesetter | null;

    /**
     * The Markdown parser.
     */
    markdownParser?: IMarkdownParser | null;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }

  /**
   * The options used to sanitize.
   */
  export interface ISanitizerOptions {
    /**
     * The allowed tags.
     */
    allowedTags?: string[];

    /**
     * The allowed attributes for a given tag.
     */
    allowedAttributes?: { [key: string]: string[] };

    /**
     * The allowed style values for a given tag.
     */
    allowedStyles?: { [key: string]: { [key: string]: RegExp[] } };
  }

  /**
   * An object that handles html sanitization.
   */
  export interface ISanitizer {
    /**
     * @returns Whether to replace URLs by HTML anchors.
     */
    getAutolink?(): boolean;

    /**
     * Sanitize an HTML string.
     *
     * @param dirty - The dirty text.
     * @param options - The optional sanitization options.
     *
     * @returns The sanitized string.
     */
    sanitize(dirty: string, options?: ISanitizerOptions): string;

    /**
     * @returns Whether to allow name and id properties.
     */
    readonly allowNamedProperties?: boolean;
  }

  /**
   * An object that handles links on a node.
   */
  export interface ILinkHandler {
    /**
     * Add the link handler to the node.
     *
     * @param node the anchor node for which to handle the link.
     *
     * @param path the path to open when the link is clicked.
     *
     * @param id an optional element id to scroll to when the path is opened.
     */
    handleLink(node: HTMLElement, path: string, id?: string): void;
    /**
     * Add the path handler to the node.
     *
     * @param node the anchor node for which to handle the link.
     *
     * @param path the path to open when the link is clicked.
     *
     * @param scope the scope to which the path is bound.
     *
     * @param id an optional element id to scroll to when the path is opened.
     */
    handlePath?(
      node: HTMLElement,
      path: string,
      scope: 'kernel' | 'server',
      id?: string
    ): void;
  }

  export interface IResolvedLocation {
    /**
     * Location scope.
     */
    scope: 'kernel' | 'server';
    /**
     * Resolved path.
     */
    path: string;
  }

  /**
   * An object that resolves relative URLs.
   */
  export interface IResolver {
    /**
     * Resolve a relative url to an absolute url path.
     */
    resolveUrl(url: string, context?: IResolveUrlContext): Promise<string>;

    /**
     * Get the download url for a given absolute url path.
     *
     * #### Notes
     * This URL may include a query parameter.
     */
    getDownloadUrl(url: string): Promise<string>;

    /**
     * Whether the URL should be handled by the resolver
     * or not.
     *
     * @param allowRoot - Whether the paths starting at Unix-style filesystem root (`/`) are permitted.
     *
     * #### Notes
     * This is similar to the `isLocal` check in `URLExt`,
     * but can also perform additional checks on whether the
     * resolver should handle a given URL.
     */
    isLocal?: (url: string, allowRoot?: boolean) => boolean;

    /**
     * Resolve a path from Jupyter kernel to a path:
     * - relative to `root_dir` (preferably) this is in jupyter-server scope,
     * - path understood and known by kernel (if such a path exists).
     * Returns `null` if there is no file matching provided path in neither
     * kernel nor jupyter-server contents manager.
     */
    resolvePath?: (path: string) => Promise<IResolvedLocation | null>;
  }

  type UrlAttributes = 'href' | 'src';

  type TagsAcceptingUrls = {
    [K in keyof HTMLElementTagNameMap]: Extract<
      keyof HTMLElementTagNameMap[K],
      UrlAttributes
    > extends never
      ? never
      : K;
  }[keyof HTMLElementTagNameMap];

  /**
   * Context in which the URL is being resolved.
   *
   * This is useful to specify for applications which wish to base64-encode
   * contents of certain local files referenced by URLs, e.g. images, short
   * videos, or CSS styles. Because base64-encoding is not advisable or even
   * impossible for some combinations of tags and attributes, the resolving
   * function needs know both the tag and the attribute to decide whether
   * to base64-encode or not. For example, passing encoding contents to `href`
   * in the `<link>` context can be used to provide CSS styles, but doing the
   * same for `href` in `<a>` context URL will prevent navigation.
   */
  export interface IResolveUrlContext {
    /**
     * Attribute for which the URL is being resolved.
     */
    attribute?: UrlAttributes;
    /**
     * Tag for which the URL is being resolved, e.g. `a` or `img`.
     */
    tag?: TagsAcceptingUrls;
  }

  /**
   * The interface for a LaTeX typesetter.
   */
  export interface ILatexTypesetter {
    /**
     * Typeset a DOM element.
     *
     * @param element - the DOM element to typeset. The typesetting may
     *   happen synchronously or asynchronously.
     */
    typeset(element: HTMLElement): void | Promise<void>;
  }

  /**
   * The interface for a Markdown parser.
   */
  export interface IMarkdownParser {
    /**
     * Render a markdown source into unsanitized HTML.
     *
     * @param source - The string to render.
     * @returns - A promise of the string containing HTML which may require sanitization.
     */
    render(source: string): Promise<string>;
  }

  // ********************** //
  // Translation interfaces //
  // ********************** //

  /**
   * Bundle of gettext-based translation functions for a specific domain.
   */
  export type TranslationBundle = {
    /**
     * Alias for `gettext` (translate strings without number inflection)
     * @param msgid message (text to translate)
     * @param args
     *
     * @returns A translated string if found, or the original string.
     */
    __(msgid: string, ...args: any[]): string;
    /**
     * Alias for `ngettext` (translate accounting for plural forms)
     * @param msgid message for singular
     * @param msgid_plural message for plural
     * @param n determines which plural form to use
     * @param args
     *
     * @returns A translated string if found, or the original string.
     */
    _n(msgid: string, msgid_plural: string, n: number, ...args: any[]): string;
    /**
     * Alias for `pgettext` (translate in given context)
     * @param msgctxt context
     * @param msgid message (text to translate)
     * @param args
     *
     * @returns A translated string if found, or the original string.
     */
    _p(msgctxt: string, msgid: string, ...args: any[]): string;
    /**
     * Alias for `npgettext` (translate accounting for plural forms in given context)
     * @param msgctxt context
     * @param msgid message for singular
     * @param msgid_plural message for plural
     * @param n number used to determine which plural form to use
     * @param args
     *
     * @returns A translated string if found, or the original string.
     */
    _np(
      msgctxt: string,
      msgid: string,
      msgid_plural: string,
      n: number,
      ...args: any[]
    ): string;
    /**
     * Look up the message id in the catalog and return the corresponding message string.
     * Otherwise, the message id is returned.
     *
     * @param msgid message (text to translate)
     * @param args
     *
     * @returns A translated string if found, or the original string.
     */
    gettext(msgid: string, ...args: any[]): string;
    /**
     * Do a plural-forms lookup of a message id. msgid is used as the message id for
     * purposes of lookup in the catalog, while n is used to determine which plural form
     * to use. Otherwise, when n is 1 msgid is returned, and msgid_plural is returned in
     * all other cases.
     *
     * @param msgid message for singular
     * @param msgid_plural message for plural
     * @param n determines which plural form to use
     * @param args
     *
     * @returns A translated string if found, or the original string.
     */
    ngettext(
      msgid: string,
      msgid_plural: string,
      n: number,
      ...args: any[]
    ): string;
    /**
     * Look up the context and message id in the catalog and return the corresponding
     * message string. Otherwise, the message id is returned.
     *
     * @param msgctxt context
     * @param msgid message (text to translate)
     * @param args
     *
     * @returns A translated string if found, or the original string.
     */
    pgettext(msgctxt: string, msgid: string, ...args: any[]): string;
    /**
     * Do a plural-forms lookup of a message id. msgid is used as the message id for
     * purposes of lookup in the catalog, while n is used to determine which plural
     * form to use. Otherwise, when n is 1 msgid is returned, and msgid_plural is
     * returned in all other cases.
     *
     * @param msgctxt context
     * @param msgid message for singular
     * @param msgid_plural message for plural
     * @param n number used to determine which plural form to use
     * @param args
     *
     * @returns A translated string if found, or the original string.
     */
    npgettext(
      msgctxt: string,
      msgid: string,
      msgid_plural: string,
      n: number,
      ...args: any[]
    ): string;

    /**
     * Do a plural-forms lookup of a message id. msgid is used as the message id for
     * purposes of lookup in the catalog, while n is used to determine which plural
     * form to use. Otherwise, when n is 1 msgid is returned, and msgid_plural is
     * returned in all other cases.
     *
     * @param domain - The translations domain.
     * @param msgctxt - The message context.
     * @param msgid - The singular string to translate.
     * @param msgid_plural - The plural string to translate.
     * @param n - The number for pluralization.
     * @param args - Any additional values to use with interpolation
     *
     * @returns A translated string if found, or the original string.
     */
    dcnpgettext(
      domain: string,
      msgctxt: string,
      msgid: string,
      msgid_plural: string,
      n: number,
      ...args: any[]
    ): string;
  };

  /**
   * Translation provider interface
   */
  export interface ITranslator {
    /**
     * The code of the language in use.
     */
    readonly languageCode: string;

    /**
     * Load translation bundles for a given domain.
     *
     * @param domain The translation domain to use for translations.
     *
     * @returns The translation bundle if found, or the English bundle.
     */
    load(domain: string): TranslationBundle;
  }
}
