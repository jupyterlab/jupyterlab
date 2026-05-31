// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IChangedArgs } from '@jupyterlab/coreutils';
import type { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import { Token } from '@lumino/coreutils';
import type { IDisposable } from '@lumino/disposable';
import type { ISignal } from '@lumino/signaling';
import type { AccordionPanel, CommandPalette, Widget } from '@lumino/widgets';
import type { ISessionContext } from './sessioncontext';
import type { Licenses } from './licenses';

/**
 * The command palette token.
 */
export const ICommandPalette = new Token<ICommandPalette>(
  '@jupyterlab/apputils:ICommandPalette',
  `A service for the application command palette
  in the left panel. Use this to add commands to the palette.`
);

/**
 * The options for creating a command palette item.
 */
export interface IPaletteItem extends CommandPalette.IItemOptions {}

/**
 * The interface for a Jupyter Lab command palette.
 */
export interface ICommandPalette {
  /**
   * The placeholder text of the command palette's search input.
   */
  placeholder: string;

  /**
   * Activate the command palette for user input.
   */
  activate(): void;

  /**
   * Add a command item to the command palette.
   *
   * @param options - The options for creating the command item.
   *
   * @returns A disposable that will remove the item from the palette.
   */
  addItem(options: IPaletteItem): IDisposable;
}

/**
 * The kernel status indicator model.
 */
export const IKernelStatusModel = new Token<IKernelStatusModel>(
  '@jupyterlab/apputils:IKernelStatusModel',
  'A service to register kernel session provider to the kernel status indicator.'
);

/**
 * Kernel status indicator model.
 */
export interface IKernelStatusModel {
  /**
   * Add a session context provider.
   *
   * A provider will receive the currently active widget and must return the
   * associated session context if it can or null otherwise.
   */
  addSessionProvider: (
    provider: (widget: Widget | null) => ISessionContext | null
  ) => void;
}

/**
 * The license client for fetching licenses.
 */
export const ILicensesClient = new Token<ILicensesClient>(
  '@jupyterlab/apputils:ILicensesClient',
  'A service for fetching licenses.'
);

/**
 * An interface for the license client.
 */
export interface ILicensesClient {
  /**
   * Fetch the license bundles from the server.
   */
  getBundles(): Promise<Licenses.ILicenseResponse>;

  /**
   * Download the licenses in the requested format.
   */
  download(options: Licenses.IDownloadOptions): Promise<void>;
}

/**
 * An interface for the session context dialogs.
 */
export interface ISessionContextDialogs extends ISessionContext.IDialogs {}

/**
 * The session context dialogs token.
 */
export const ISessionContextDialogs = new Token<ISessionContext.IDialogs>(
  '@jupyterlab/apputils:ISessionContextDialogs',
  'A service for handling the session dialogs.'
);

/**
 * The theme manager token.
 */
export const IThemeManager = new Token<IThemeManager>(
  '@jupyterlab/apputils:IThemeManager',
  'A service for the theme manager for the application. This is used primarily in theme extensions to register new themes.'
);

/**
 * An interface for a theme manager.
 */
export interface IThemeManager {
  /**
   * Get the name of the current theme.
   */
  readonly theme: string | null;

  /**
   * Get the name of the preferred light theme.
   */
  readonly preferredLightTheme?: string | undefined;

  /**
   * Get the name of the preferred dark theme.
   */
  readonly preferredDarkTheme?: string | undefined;

  /**
   * Get the name of the preferred theme.
   */
  readonly preferredTheme?: string | null | undefined;

  /**
   * The names of the registered themes.
   */
  readonly themes: ReadonlyArray<string>;

  /**
   * Get the names of the registered light themes.
   */
  readonly lightThemes?: ReadonlyArray<string> | undefined;

  /**
   * Get the names of the registered dark themes.
   */
  readonly darkThemes?: ReadonlyArray<string> | undefined;

  /**
   * A signal fired when the application theme changes.
   */
  readonly themeChanged: ISignal<this, IChangedArgs<string, string | null>>;

  /**
   * Load a theme CSS file by path.
   *
   * @param path - The path of the file to load.
   */
  loadCSS(path: string): Promise<void>;

  /**
   * Register a theme with the theme manager.
   *
   * @param theme - The theme to register.
   *
   * @returns A disposable that can be used to unregister the theme.
   */
  register(theme: IThemeManager.ITheme): IDisposable;

  /**
   * Set the current theme.
   */
  setTheme(name: string): Promise<void>;

  /**
   * Test whether a given theme is light.
   */
  isLight(name: string): boolean;

  /**
   * Test whether a given theme styles scrollbars,
   * and if the user has scrollbar styling enabled.
   */
  themeScrollbars(name: string): boolean;

  /**
   * Get display name for theme.
   */
  getDisplayName(name: string): string;
}

/**
 * A namespace for the `IThemeManager` sub-types.
 */
export namespace IThemeManager {
  /**
   * An interface for a theme.
   */
  export interface ITheme {
    /**
     * The unique identifier name of the theme.
     */
    name: string;

    /**
     * The display name of the theme.
     */
    displayName?: string;

    /**
     * Whether the theme is light or dark. Downstream authors
     * of extensions can use this information to customize their
     * UI depending upon the current theme.
     */
    isLight: boolean;

    /**
     * Whether the theme includes styling for the scrollbar.
     * If set to false, this theme will leave the native scrollbar untouched.
     */
    themeScrollbars?: boolean;

    /**
     * Load the theme.
     *
     * @returns A promise that resolves when the theme has loaded.
     */
    load(): Promise<void>;

    /**
     * Unload the theme.
     *
     * @returns A promise that resolves when the theme has unloaded.
     */
    unload(): Promise<void>;
  }
}

/**
 * The sanitizer token.
 */
export const ISanitizer = new Token<IRenderMime.ISanitizer>(
  '@jupyterlab/apputils:ISanitizer',
  'A service for sanitizing HTML strings.'
);

/**
 * @deprecated since v4 use {@link IRenderMime.ISanitizer}
 */
export type ISanitizer = IRenderMime.ISanitizer;

/**
 * The namespace for `ISanitizer` related interfaces.
 */
export namespace ISanitizer {
  /**
   * The options used to sanitize.
   *
   * @deprecated in v4 use {@link IRenderMime.ISanitizerOptions}
   */
  export type IOptions = IRenderMime.ISanitizerOptions;
}

/**
 * The main menu token.
 */
export const ISplashScreen = new Token<ISplashScreen>(
  '@jupyterlab/apputils:ISplashScreen',
  `A service for the splash screen for the application.
  Use this if you want to show the splash screen for your own purposes.`
);

/**
 * The interface for an application splash screen.
 */
export interface ISplashScreen {
  /**
   * Show the application splash screen.
   *
   * @param light - Whether to show the light splash screen or the dark one.
   *
   * @returns A disposable used to clear the splash screen.
   */
  show(light?: boolean): IDisposable;
}

/**
 * The default window resolver token.
 */
export const IWindowResolver = new Token<IWindowResolver>(
  '@jupyterlab/apputils:IWindowResolver',
  `A service for a window resolver for the
  application. JupyterLab workspaces are given a name, which are determined using
  the window resolver. Require this if you want to use the name of the current workspace.`
);

/**
 * The description of a window name resolver.
 */
export interface IWindowResolver {
  /**
   * A window name to use as a handle among shared resources.
   */
  readonly name: string;
}

/**
 * The namespace for `IToolbarWidgetRegistry` related interfaces
 */
export namespace ToolbarRegistry {
  /**
   * Interface of item to be inserted in a toolbar
   */
  export interface IToolbarItem extends IRenderMime.IToolbarItem {}

  /**
   * Interface describing a toolbar item widget
   */
  export interface IWidget extends ISettingRegistry.IToolbarItem {}

  /**
   * Options to set up the toolbar widget registry
   */
  export interface IOptions {
    /**
     * Default toolbar widget factory
     *
     * The factory is receiving 3 arguments:
     * @param widgetFactory The widget factory name that creates the toolbar
     * @param widget The newly widget containing the toolbar
     * @param toolbarItem The toolbar item definition
     * @returns The widget to be inserted in the toolbar.
     */
    defaultFactory: (
      widgetFactory: string,
      widget: Widget,
      toolbarItem: IWidget
    ) => Widget;
  }
}

/**
 * Toolbar widget registry interface
 */
export interface IToolbarWidgetRegistry {
  /**
   * Add a new toolbar item factory
   *
   * @param widgetFactory The widget factory name that creates the toolbar
   * @param toolbarItemName The unique toolbar item
   * @param factory The factory function that receives the widget containing the toolbar and returns the toolbar widget.
   * @returns The previously defined factory
   */
  addFactory<T extends Widget = Widget>(
    widgetFactory: string,
    toolbarItemName: string,
    factory: (main: T) => Widget
  ): ((main: T) => Widget) | undefined;

  /**
   * Default toolbar item factory
   */
  defaultFactory: (
    widgetFactory: string,
    widget: Widget,
    toolbarItem: ToolbarRegistry.IWidget
  ) => Widget;

  /**
   * Create a toolbar item widget
   *
   * @param widgetFactory The widget factory name that creates the toolbar
   * @param widget The newly widget containing the toolbar
   * @param toolbarItem The toolbar item definition
   * @returns The widget to be inserted in the toolbar.
   */
  createWidget(
    widgetFactory: string,
    widget: Widget,
    toolbarItem: ToolbarRegistry.IWidget
  ): Widget;

  /**
   * Register a new toolbar item factory
   *
   * @param widgetFactory The widget factory name that creates the toolbar
   * @param toolbarItemName The unique toolbar item
   * @param factory The factory function that receives the widget containing the toolbar and returns the toolbar widget.
   * @returns The previously defined factory
   *
   * @deprecated since v4 use `addFactory` instead
   */
  registerFactory<T extends Widget = Widget>(
    widgetFactory: string,
    toolbarItemName: string,
    factory: (main: T) => Widget
  ): ((main: T) => Widget) | undefined;

  /**
   * A signal emitted when a factory widget has been added.
   */
  readonly factoryAdded: ISignal<this, string>;
}

/**
 * The toolbar registry token.
 */
export const IToolbarWidgetRegistry = new Token<IToolbarWidgetRegistry>(
  '@jupyterlab/apputils:IToolbarWidgetRegistry',
  `A registry for toolbar widgets. Require this
  if you want to build the toolbar dynamically from a data definition (stored in settings for example).`
);

/**
 * A section entry returned by {@link IMovableSectionSource.getSections}.
 *
 * Bundles the three pieces of information the move plugin needs to identify,
 * display, and transfer a sidebar section.
 */
export interface ISectionEntry {
  /**
   * Stable identifier for this section, equal to the widget's Lumino `id`.
   *
   * The move plugin uses this to persist which sections have been moved and
   * to restore them to the correct panel on reload.
   */
  readonly id: string;

  /**
   * The `.jp-AccordionPanel-title` DOM element rendered by Lumino as the
   * visual header of this section.
   *
   * The move plugin attaches the `jp-movable-section` CSS class to this node
   * so that Lumino's context-menu selector fires when the user right-clicks
   * the header.
   */
  readonly titleNode: HTMLElement;

  /**
   * The content widget for this section.
   */
  readonly widget: Widget;
}

/**
 * Implemented by sidebar panels whose accordion sections can be moved to
 * another panel by the user.
 *
 * Register an implementation with
 * {@link IMovableSectionRegistry.registerSource}.
 */
export interface IMovableSectionSource {
  /**
   * Return the currently-available sections with their title DOM nodes.
   */
  getSections(): ReadonlyArray<ISectionEntry>;

  /**
   * Detach the section identified by `sectionId` and return its widget so
   * the move plugin can hand it to a target panel.
   *
   * A typical implementation sets `widget.parent = null`, which detaches the
   * widget from the `AccordionPanel` without destroying it. Returns `null` if
   * no section with the given id currently exists in this panel.
   *
   * @param sectionId - The {@link ISectionEntry.id} of the section to remove.
   */
  removeSectionById(sectionId: string): Widget | null;

  /**
   * Re-attach a widget that was previously removed by
   * {@link removeSectionById}.
   *
   * Called when the user chooses "Move back to …" on a section that was
   * originally owned by this panel. A typical implementation calls
   * `this.addWidget(widget)`.
   *
   * @param widget - The widget returned by an earlier {@link removeSectionById}
   *   call.
   */
  reinsertSection(widget: Widget): void;

  /**
   * The `AccordionPanel` that renders this sidebar's sections.
   *
   * The move plugin reads this to set up drag-to-reorder handles after a
   * section is moved.
   */
  readonly accordionPanel: AccordionPanel | null;

  /**
   * Emitted each time a new section widget is added to this panel.
   *
   * Implementations should emit this signal from `addWidget` (or equivalent)
   * with a fully-populated {@link ISectionEntry} for the newly added widget.
   */
  readonly sectionAdded: ISignal<this, ISectionEntry>;
}

/**
 * Implemented by panels that can host sections moved in from another sidebar.
 *
 * Register an implementation with
 * {@link IMovableSectionRegistry.registerTarget}.
 */
export interface IMovableSectionDestination {
  /**
   * Insert a section widget into this panel.
   *
   * Called by the move plugin when the user selects "Move to …" from the
   * context menu. A typical implementation calls `this.addWidget(widget)`.
   *
   * @param widget - The widget detached from its source panel.
   */
  addSection(widget: Widget): void;

  /**
   * Remove a section widget that was previously added via {@link addSection}.
   *
   * Called by the move plugin when the user moves the section back to its
   * original panel. A typical implementation sets `widget.parent = null`.
   *
   * @param widget - The widget to detach.
   */
  removeSectionWidget(widget: Widget): void;

  /**
   * All section widgets currently hosted by this panel.
   *
   * Queried by the move plugin during state restoration to find sections that
   * were persisted as belonging to this panel. Must stay in sync with
   * {@link addSection} and {@link removeSectionWidget} calls.
   */
  readonly sections: ReadonlyArray<Widget>;

  /**
   * The `AccordionPanel` that wraps the hosted sections, or `null` if none
   * has been created yet.
   *
   * The move plugin reads this to set up drag-to-reorder handles and to access
   * the title elements of hosted sections.
   */
  readonly accordionPanel: AccordionPanel | null;
}

/**
 * Registry that pairs source and target panels so the move plugin can wire up
 * context-menu "Move to …" actions between them.
 */
export interface IMovableSectionRegistry {
  /**
   * Register a sidebar as a source of moveable sections.
   *
   * After registration the move plugin adds a "Move to <target>" context-menu
   * item to each section header in `sidebar`. The `label` appears in the menu
   * as "Move back to <label>" on the destination side.
   *
   * @param id - Stable plugin-scoped identifier, e.g.
   *   `'@my-org/my-ext:panel'`. Must be unique across all registered sources.
   * @param label - Human-readable panel name shown in the context menu.
   * @param sidebar - The panel implementing {@link IMovableSectionSource}.
   */
  registerSource(
    id: string,
    label: string,
    sidebar: IMovableSectionSource
  ): void;

  /**
   * Register a panel as a destination that can receive sections.
   *
   * After registration the move plugin adds a "Move to <label>" context-menu
   * item to eligible section headers in all registered source panels.
   *
   * @param id - Stable plugin-scoped identifier. Must be unique across all
   *   registered targets.
   * @param label - Human-readable panel name shown in the context menu.
   * @param panel - The panel implementing {@link IMovableSectionDestination}.
   */
  registerTarget(
    id: string,
    label: string,
    panel: IMovableSectionDestination
  ): void;

  /**
   * Return all registered source sidebars keyed by their `id`.
   */
  getSources(): ReadonlyMap<
    string,
    { label: string; sidebar: IMovableSectionSource }
  >;

  /**
   * Return all registered target panels keyed by their `id`.
   */
  getTargets(): ReadonlyMap<
    string,
    { label: string; panel: IMovableSectionDestination }
  >;

  /**
   * Fired each time a new source sidebar is registered via
   * {@link registerSource}.
   *
   * The move plugin listens to this signal to retroactively wire up context
   * menus for sources that register after the plugin has already activated.
   */
  readonly sourcePanelRegistered: ISignal<
    IMovableSectionRegistry,
    { id: string; label: string; sidebar: IMovableSectionSource }
  >;

  /**
   * Fired each time a new target panel is registered via
   * {@link registerTarget}.
   *
   * The move plugin listens to this signal to add the new target as an option
   * in the context menus of all currently-registered source panels.
   */
  readonly targetPanelRegistered: ISignal<
    IMovableSectionRegistry,
    { id: string; label: string; panel: IMovableSectionDestination }
  >;
}

/**
 * The movable section registry token.
 */
export const IMovableSectionRegistry = new Token<IMovableSectionRegistry>(
  '@jupyterlab/apputils:IMovableSectionRegistry',
  'A registry for panels that can exchange moveable sections.'
);
