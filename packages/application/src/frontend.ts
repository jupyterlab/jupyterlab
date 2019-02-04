// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CommandLinker } from '@jupyterlab/apputils';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { ServiceManager } from '@jupyterlab/services';

import { IIterator } from '@phosphor/algorithm';

import { Application, IPlugin } from '@phosphor/application';

import { Token } from '@phosphor/coreutils';

import { Widget } from '@phosphor/widgets';

/**
 * The type for all JupyterFrontEnd application plugins.
 *
 * #### Notes
 * The generic `T` argument indicates the type that the plugin `provides` upon
 * being activated.
 */
export type JupyterFrontEndPlugin<T> = IPlugin<JupyterFrontEnd, T>;

/**
 * The base Jupyter front-end application class.
 *
 * #### Notes
 * This type is useful as a generic application against which front-end plugins
 * can be authored. It inherits from the phosphor `Application`.
 *
 * The generic type argument semantics are as follows.
 *
 * `T extends JupyterFrontEnd.Shell = JupyterFrontEnd.Shell` - the type of the
 * `shell` attribute of a `JupyterFrontEnd`.
 */
export abstract class JupyterFrontEnd<
  T extends JupyterFrontEnd.IShell = JupyterFrontEnd.IShell
> extends Application<T> {
  /**
   * Construct a new JupyterFrontEnd object.
   */
  constructor(options: JupyterFrontEnd.IOptions<T>) {
    super(options);

    // The default restored promise if one does not exist in the options.
    const restored = new Promise(resolve => {
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

    this.commands.addCommand(Private.CONTEXT_MENU_INFO, {
      label: 'Shift+Right Click for Browser Menu',
      isEnabled: () => false,
      execute: () => void 0
    });

    this.contextMenu.addItem({
      command: Private.CONTEXT_MENU_INFO,
      selector: 'body',
      rank: Infinity
    });
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
  readonly serviceManager: ServiceManager;

  /**
   * Walks up the DOM hierarchy of the target of the active `contextmenu`
   * event, testing the nodes for a user-supplied funcion. This can
   * be used to find a node on which to operate, given a context menu click.
   *
   * @param test - a function that takes an `HTMLElement` and returns a
   *   boolean for whether it is the element the requester is seeking.
   *
   * @returns an HTMLElement or undefined, if none is found.
   */
  contextMenuHitTest(
    test: (node: HTMLElement) => boolean
  ): HTMLElement | undefined {
    if (
      !this._contextMenuEvent ||
      !(this._contextMenuEvent.target instanceof HTMLElement)
    ) {
      return undefined;
    }
    let node = this._contextMenuEvent.target as HTMLElement;
    do {
      if (test(node)) {
        return node;
      }
      node = node.parentNode as HTMLElement;
    } while (node.parentNode && node !== node.parentNode);
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
    if (event.shiftKey) {
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
        items[0].command === Private.CONTEXT_MENU_INFO
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
    serviceManager?: ServiceManager;

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
    readonly currentWidget: Widget;

    /**
     * Returns an iterator for the widgets inside the application shell.
     *
     * @param area - Optional regions in the shell whose widgets are iterated.
     */
    widgets(area?: string): IIterator<Widget>;
  }

  /**
   * The application paths dictionary token.
   */
  export const IPaths = new Token<IPaths>('@jupyterlab/application:IPaths');

  /**
   * An interface for URL and directory paths used by a Jupyter front-end.
   */
  export interface IPaths {
    /**
     * The urls used by the application.
     */
    readonly urls: {
      readonly base: string;
      readonly defaultWorkspace: string;
      readonly notFound?: string;
      readonly page: string;
      readonly public: string;
      readonly settings: string;
      readonly themes: string;
      readonly tree: string;
      readonly workspaces: string;
    };

    /**
     * The local directories used by the application.
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
}

/**
 * A namespace for module-private functionality.
 */
namespace Private {
  /**
   * An id for a private context-menu-info
   * ersatz command.
   */
  export const CONTEXT_MENU_INFO = '__internal:context-menu-info';
}
