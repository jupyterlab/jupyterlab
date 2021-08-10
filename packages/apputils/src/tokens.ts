// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IChangedArgs } from '@jupyterlab/coreutils';
import { Token } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { ISignal } from '@lumino/signaling';
import { CommandPalette } from '@lumino/widgets';
import { ISessionContext } from './sessioncontext';

/* tslint:disable */
/**
 * The command palette token.
 */
export const ICommandPalette = new Token<ICommandPalette>(
  '@jupyterlab/apputils:ICommandPalette'
);
/* tslint:enable */

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
 * An interface for the session context dialogs.
 */
export interface ISessionContextDialogs extends ISessionContext.IDialogs {}

/* tslint:disable */
/**
 * The session context dialogs token.
 */
export const ISessionContextDialogs = new Token<ISessionContext.IDialogs>(
  '@jupyterlab/apputils:ISessionContextDialogs'
);
/* tslint:enable */

/* tslint:disable */
/**
 * The theme manager token.
 */
export const IThemeManager = new Token<IThemeManager>(
  '@jupyterlab/apputils:IThemeManager'
);
/* tslint:enable */

/**
 * An interface for a theme manager.
 */
export interface IThemeManager {
  /**
   * Get the name of the current theme.
   */
  readonly theme: string | null;

  /**
   * The names of the registered themes.
   */
  readonly themes: ReadonlyArray<string>;

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
export const ISanitizer = new Token<ISanitizer>(
  '@jupyterlab/apputils:ISanitizer'
);

export interface ISanitizer {
  /**
   * Sanitize an HTML string.
   *
   * @param dirty - The dirty text.
   *
   * @param options - The optional sanitization options.
   *
   * @returns The sanitized string.
   */
  sanitize(dirty: string, options?: ISanitizer.IOptions): string;
}

/**
 * The namespace for `ISanitizer` related interfaces.
 */
export namespace ISanitizer {
  /**
   * The options used to sanitize.
   */
  export interface IOptions {
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
}

/* tslint:disable */
/**
 * The main menu token.
 */
export const ISplashScreen = new Token<ISplashScreen>(
  '@jupyterlab/apputils:ISplashScreen'
);
/* tslint:enable */

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

/* tslint:disable */
/**
 * The default window resolver token.
 */
export const IWindowResolver = new Token<IWindowResolver>(
  '@jupyterlab/apputils:IWindowResolver'
);
/* tslint:enable */

/**
 * The description of a window name resolver.
 */
export interface IWindowResolver {
  /**
   * A window name to use as a handle among shared resources.
   */
  readonly name: string;
}
