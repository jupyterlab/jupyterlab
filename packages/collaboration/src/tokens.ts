// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { AccordionPanel, Menu } from '@lumino/widgets';
import { ISignal } from '@lumino/signaling';
import { Token } from '@lumino/coreutils';
import { Awareness } from 'y-protocols/awareness';

/**
 * An ID to track the user on StateDB.
 */
export const USER = '@jupyterlab/collaboration:userDB';

/**
 * @experimental
 * @alpha
 *
 * The user token.
 *
 * NOTE: Requirer this token in your extension to access the
 * current connected user information.
 */
export const ICurrentUser = new Token<ICurrentUser>(
  '@jupyterlab/collaboration:ICurrentUser'
);

/**
 * The user menu token.
 *
 * NOTE: Require this token in your extension to access the user menu
 * (top-right menu in JupyterLab's interface).
 */
export const IUserMenu = new Token<IUserMenu>(
  '@jupyterlab/collaboration:IUserMenu'
);

/**
 * The user panel token.
 */
export const IUserPanel = new Token<AccordionPanel>(
  '@jupyterlab/collaboration:IUserPanel'
);

/**
 * The global awareness token.
 */
export const IGlobalAwareness = new Token<IAwareness>(
  '@jupyterlab/collaboration:IGlobalAwareness'
);

/**
 * The awareness interface.
 */
export interface IAwareness extends Awareness {}

/**
 * @experimental
 * @alpha
 *
 * An interface describing the current user.
 */
export interface ICurrentUser extends IUser.User {
  /**
   * Whether the user information is loaded or not.
   */
  readonly isReady: boolean;

  /**
   * Signal emitted when the user's information is ready.
   */
  readonly ready: ISignal<ICurrentUser, boolean>;

  /**
   * Signal emitted when the user's information changes.
   */
  readonly changed: ISignal<ICurrentUser, void>;

  /**
   * Convenience method to modify the user as a JSON object.
   *
   * @argument user: user info as JSON object.
   */
  fromJSON(user: IUser.User): void;

  /**
   * Convenience method to export the user as a JSON object.
   *
   * @returns user info as JSON object.
   */
  toJSON(): IUser.User;
}

/**
 * The user namespace.
 */
export namespace IUser {
  /**
   * The type for the IUser.
   *
   * Convenience for treating the user's info as a JSON object.
   */
  export type User = {
    /**
     * User's unique identifier.
     */
    readonly username: string;

    /**
     * User's full name.
     */
    readonly name: string;

    /**
     * Shorter version of the name for displaying it on the UI.
     */
    readonly displayName: string;

    /**
     * User's name initials.
     */
    readonly initials: string;

    /**
     * User's cursor color and icon color if avatar_url is undefined
     * (there is no image).
     */
    readonly color: string;

    /**
     * Whether the user is anonymous or not.
     *
     * NOTE: Jupyter server doesn't handle user's identity so, by default every user
     * is anonymous unless a third-party extension provides the ICurrentUser token retrieving
     * the user identity from a third-party identity provider as GitHub, Google, etc.
     */
    readonly anonymous: boolean;

    /**
     * User's cursor position on the document.
     *
     * If undefined, the user is not on a document.
     */
    readonly cursor?: IUser.Cursor;

    /**
     * User's avatar url.
     * The url to the user's image for the icon.
     */
    readonly avatar_url?: string;
  };

  export type Cursor = {
    /**
     * Document where the user is currently focused.
     */
    document: string;

    /**
     * Cell where the user is focused.
     *
     * NOTE: 0 for plain text files.
     */
    cell: number;

    /**
     * Position of the cursor in the cell.
     */
    index: number;
  };
}

/**
 * An interface describing the user menu.
 */
export interface IUserMenu {
  /**
   * Dispose of the resources held by the menu.
   */
  dispose(): void;

  /**
   * Test whether the widget has been disposed.
   */
  readonly isDisposed: boolean;

  /**
   * A read-only array of the menu items in the menu.
   */
  readonly items: ReadonlyArray<Menu.IItem>;

  /**
   * Add a menu item to the end of the menu.
   *
   * @param options - The options for creating the menu item.
   *
   * @returns The menu item added to the menu.
   */
  addItem(options: Menu.IItemOptions): Menu.IItem;

  /**
   * Insert a menu item into the menu at the specified index.
   *
   * @param index - The index at which to insert the item.
   *
   * @param options - The options for creating the menu item.
   *
   * @returns The menu item added to the menu.
   *
   * #### Notes
   * The index will be clamped to the bounds of the items.
   */
  insertItem(index: number, options: Menu.IItemOptions): Menu.IItem;

  /**
   * Remove an item from the menu.
   *
   * @param item - The item to remove from the menu.
   *
   * #### Notes
   * This is a no-op if the item is not in the menu.
   */
  removeItem(item: Menu.IItem): void;
}
