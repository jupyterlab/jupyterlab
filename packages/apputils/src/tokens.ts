// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IChangedArgs } from '@jupyterlab/coreutils';

import { Token } from '@lumino/coreutils';

import { IDisposable } from '@lumino/disposable';

import { ISignal } from '@lumino/signaling';

import { ISessionContext } from './sessioncontext';

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
     * The display name of the theme.
     */
    name: string;

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
