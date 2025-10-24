// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IChangedArgs } from '@jupyterlab/coreutils';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { Token } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { ISignal } from '@lumino/signaling';
import { CommandPalette, Widget } from '@lumino/widgets';
import { ISessionContext } from './sessioncontext';
import { Licenses } from './licenses';

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
