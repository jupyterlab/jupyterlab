// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CommandLinker } from '@jupyterlab/apputils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { ServiceManager } from '@jupyterlab/services';
import { ContextMenuSvg } from '@jupyterlab/ui-components';
import { Application, IPlugin } from '@lumino/application';
import { Token } from '@lumino/coreutils';
import { ISignal, Signal } from '@lumino/signaling';
import { FocusTracker, Widget } from '@lumino/widgets';

/**
 * The type for all JupyterFrontEnd application plugins.
 *
 * @typeparam T - The type that the plugin `provides` upon being activated.
 *
 * @typeparam U - The type of the application shell.
 *
 * @typeparam V - The type that defines the application formats.
 */
export type JupyterFrontEndPlugin<
  T,
  U extends JupyterFrontEnd.IShell = JupyterFrontEnd.IShell,
  V extends string = 'desktop' | 'mobile'
> = IPlugin<JupyterFrontEnd<U, V>, T>;

/**
 * The base Jupyter front-end application class.
 *
 * @typeparam `T` - The `shell` type. Defaults to `JupyterFrontEnd.IShell`.
 *
 * @typeparam `U` - The type for supported format names. Defaults to `string`.
 *
 * #### Notes
 * This type is useful as a generic application against which front-end plugins
 * can be authored. It inherits from the Lumino `Application`.
 */
export abstract class JupyterFrontEnd<
  T extends JupyterFrontEnd.IShell = JupyterFrontEnd.IShell,
  U extends string = 'desktop' | 'mobile'
> extends Application<T> {
  /**
   * Construct a new JupyterFrontEnd object.
   */
  constructor(options: JupyterFrontEnd.IOptions<T>) {
    super(options);

    // Class to scope global Jupyter CSS rules
    options.shell.addClass('jp-ThemedContainer');

    // render context menu/submenus with inline svg icon tweaks
    this.contextMenu = new ContextMenuSvg({
      commands: this.commands,
      renderer: options.contextMenuRenderer,
      groupByTarget: false,
      sortBySelector: false
    });

    // The default restored promise if one does not exist in the options.
    const restored = new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        resolve();
      });
    });

    this.commandLinker =
      options.commandLinker || new CommandLinker({ commands: this.commands });
    this.docRegistry = options.docRegistry || new DocumentRegistry();
    this.restored =
      options.restored ||
      this.started.then(() => restored).catch(() => restored);
    this.serviceManager = options.serviceManager || new ServiceManager();
  }

  /**
   * The name of this Jupyter front-end application.
   */
  abstract readonly name: string;

  /**
   * A namespace/prefix plugins may use to denote their provenance.
   */
  abstract readonly namespace: string;

  /**
   * The version of this Jupyter front-end application.
   */
  abstract readonly version: string;

  /**
   * The command linker used by the application.
   */
  readonly commandLinker: CommandLinker;

  /**
   * The application context menu.
   */
  readonly contextMenu: ContextMenuSvg;

  /**
   * The document registry instance used by the application.
   */
  readonly docRegistry: DocumentRegistry;

  /**
   * Promise that resolves when state is first restored.
   */
  readonly restored: Promise<void>;

  /**
   * The service manager used by the application.
   */
  readonly serviceManager: ServiceManager.IManager;

  /**
   * The application form factor, e.g., `desktop` or `mobile`.
   */
  get format(): U {
    return this._format;
  }
  set format(format: U) {
    if (this._format !== format) {
      this._format = format;
      document.body.dataset['format'] = format;
      this._formatChanged.emit(format);
    }
  }

  /**
   * A signal that emits when the application form factor changes.
   */
  get formatChanged(): ISignal<this, U> {
    return this._formatChanged;
  }

  /**
   * Walks up the DOM hierarchy of the target of the active `contextmenu`
   * event, testing each HTMLElement ancestor for a user-supplied function. This can
   * be used to find an HTMLElement on which to operate, given a context menu click.
   *
   * @param fn - a function that takes an `HTMLElement` and returns a
   *   boolean for whether it is the element the requester is seeking.
   *
   * @returns an HTMLElement or undefined, if none is found.
   */
  contextMenuHitTest(
    fn: (node: HTMLElement) => boolean
  ): HTMLElement | undefined {
    if (
      !this._contextMenuEvent ||
      !(this._contextMenuEvent.target instanceof Node)
    ) {
      return undefined;
    }
    let node: Node | null = this._contextMenuEvent.target;
    do {
      if (node instanceof HTMLElement && fn(node)) {
        return node;
      }
      node = node.parentNode;
    } while (node && node.parentNode && node !== node.parentNode);
    return undefined;

    // TODO: we should be able to use .composedPath() to simplify this function
    // down to something like the below, but it seems like composedPath is
    // sometimes returning an empty list.
    /*
    if (this._contextMenuEvent) {
      this._contextMenuEvent
        .composedPath()
        .filter(x => x instanceof HTMLElement)
        .find(test);
    }
    return undefined;
    */
  }

  /**
   * A method invoked on a document `'contextmenu'` event.
   */
  protected evtContextMenu(event: MouseEvent): void {
    this._contextMenuEvent = event;
    if (
      event.shiftKey ||
      Private.suppressContextMenu(event.target as HTMLElement)
    ) {
      return;
    }
    const opened = this.contextMenu.open(event);
    if (opened) {
      const items = this.contextMenu.menu.items;
      // If only the context menu information will be shown,
      // with no real commands, close the context menu and
      // allow the native one to open.
      if (
        items.length === 1 &&
        items[0].command === JupyterFrontEndContextMenu.contextMenu
      ) {
        this.contextMenu.menu.close();
        return;
      }
      // Stop propagation and allow the application context menu to show.
      event.preventDefault();
      event.stopPropagation();
    }
  }

  private _contextMenuEvent: MouseEvent;
  private _format: U;
  private _formatChanged = new Signal<this, U>(this);
}

/**
 * The namespace for `JupyterFrontEnd` class statics.
 */
export namespace JupyterFrontEnd {
  /**
   * The options used to initialize a JupyterFrontEnd.
   */
  export interface IOptions<T extends IShell = IShell, U = any>
    extends Application.IOptions<T> {
    /**
     * The document registry instance used by the application.
     */
    docRegistry?: DocumentRegistry;

    /**
     * The command linker used by the application.
     */
    commandLinker?: CommandLinker;

    /**
     * The service manager used by the application.
     */
    serviceManager?: ServiceManager.IManager;

    /**
     * Promise that resolves when state is first restored, returning layout
     * description.
     */
    restored?: Promise<U>;
  }

  /**
   * A minimal shell type for Jupyter front-end applications.
   */
  export interface IShell extends Widget {
    /**
     * Activates a widget inside the application shell.
     *
     * @param id - The ID of the widget being activated.
     */
    activateById(id: string): void;

    /**
     * Add a widget to the application shell.
     *
     * @param widget - The widget being added.
     *
     * @param area - Optional region in the shell into which the widget should
     * be added.
     *
     * @param options - Optional flags the shell might use when opening the
     * widget, as defined in the `DocumentRegistry`.
     */
    add(
      widget: Widget,
      area?: string,
      options?: DocumentRegistry.IOpenOptions
    ): void;

    /**
     * The focused widget in the application shell.
     *
     * #### Notes
     * Different shell implementations have latitude to decide what "current"
     * or "focused" mean, depending on their user interface characteristics.
     */
    readonly currentWidget: Widget | null;

    /**
     * A signal emitted when the focused widget in the application shell changes.
     *
     * ### Notes
     * Shells may not always have a {@link currentWidget} or it may not change.
     * Therefore implementing this signal is only expected for shells with the ability
     * to switch between active widgets.
     *
     * Although the signal argument type references a focus tracker, the shell
     * current widget may not be the one focused as its definition is an implementation
     * detail.
     */
    readonly currentChanged?: ISignal<
      IShell,
      FocusTracker.IChangedArgs<Widget>
    >;

    /**
     * Returns an iterator for the widgets inside the application shell.
     *
     * @param area - Optional regions in the shell whose widgets are iterated.
     */
    widgets(area?: string): IterableIterator<Widget>;
  }

  /**
   * Is JupyterLab in document mode?
   *
   * @param path - Full URL of JupyterLab
   * @param paths - The current IPaths object hydrated from PageConfig.
   */
  export function inDocMode(path: string, paths: IPaths): boolean {
    const docPattern = new RegExp(`^${paths.urls.doc}`);
    const match = path.match(docPattern);
    if (match) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * The application paths dictionary token.
   */
  export const IPaths = new Token<IPaths>(
    '@jupyterlab/application:IPaths',
    `A service providing information about various
  URLs and server paths for the current application. Use this service if you want to
  assemble URLs to use the JupyterLab REST API.`
  );

  /**
   * An interface for URL and directory paths used by a Jupyter front-end.
   */
  export interface IPaths {
    /**
     * The urls used by the application.
     */
    readonly urls: {
      readonly base: string;
      readonly notFound?: string;
      readonly app: string;
      readonly doc: string;
      readonly static: string;
      readonly settings: string;
      readonly themes: string;
      readonly translations: string;
      readonly hubPrefix?: string;
      readonly hubHost?: string;
      readonly hubUser?: string;
      readonly hubServerName?: string;
    };

    /**
     * The server directories used by the application, for user information
     * only.
     *
     * #### Notes
     * These are for user information and user interface hints only and should
     * not be relied on in code. A server may set these to empty strings if it
     * does not want to expose this information.
     *
     * Examples of appropriate use include displaying a help dialog for a user
     * listing the paths, or a tooltip in a filebrowser displaying the server
     * root. Examples of inappropriate use include using one of these paths in a
     * terminal command, generating code using these paths, or using one of
     * these paths in a request to the server (it would be better to write a
     * server extension to handle these cases).
     */
    readonly directories: {
      readonly appSettings: string;
      readonly schemas: string;
      readonly static: string;
      readonly templates: string;
      readonly themes: string;
      readonly userSettings: string;
      readonly serverRoot: string;
      readonly workspaces: string;
    };
  }

  /**
   * The application tree resolver token.
   *
   * #### Notes
   * Not all Jupyter front-end applications will have a tree resolver
   * implemented on the client-side. This token should not be required as a
   * dependency if it is possible to make it an optional dependency.
   */
  export const ITreeResolver = new Token<ITreeResolver>(
    '@jupyterlab/application:ITreeResolver',
    'A service to resolve the tree path.'
  );

  /**
   * An interface for a front-end tree route resolver.
   */
  export interface ITreeResolver {
    /**
     * A promise that resolves to the routed tree paths or null.
     */
    readonly paths: Promise<ITreeResolver.Paths>;
  }

  /**
   * A namespace for tree resolver types.
   */
  export namespace ITreeResolver {
    /**
     * The browser and file paths if the tree resolver encountered and handled
     * a tree URL or `null` if not. Empty string paths should be ignored.
     */
    export type Paths = { browser: string; file: string } | null;
  }
}

/**
 * A namespace for module-private functionality.
 */
namespace Private {
  /**
   * Returns whether the element is itself, or a child of, an element with the `jp-suppress-context-menu` data attribute.
   */
  export function suppressContextMenu(element: HTMLElement): boolean {
    return element.closest('[data-jp-suppress-context-menu]') !== null;
  }
}

/**
 * A namespace for the context menu override.
 */
export namespace JupyterFrontEndContextMenu {
  /**
   * An id for a private context-menu-info ersatz command.
   */
  export const contextMenu = '__internal:context-menu-info';
}
