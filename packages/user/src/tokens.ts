// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Menu } from '@lumino/widgets';
import { ISignal } from '@lumino/signaling';
import { Token } from '@lumino/coreutils';

/**
 * An ID to track the user on StateDB.
 */
export const USER = '@jupyterlab/user:userDB';

/**
 * The user token.
 *
 * NOTE: Requirer this token in your extension to access the
 * current connected user information.
 */
export const ICurrentUser = new Token<ICurrentUser>(
  '@jupyterlab/user:ICurrentUser'
);

/**
 * The user menu token.
 *
 * NOTE: Require this token in your extension to access the user menu
 * (top-right menu in JupyterLab's interface).
 */
export const IUserMenu = new Token<IUserMenu>('@jupyterlab/user:IUserMenu');

/**
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
     * User's Username.
     */
    readonly username: string;

    /**
     * User's name.
     */
    readonly givenName: string;

    /**
     * User's last name.
     */
    readonly familyName: string;

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
     * @experimental
     * @alpha
     * @hidden
     *
     * User's role.
     *
     * @todo: define roles
     * NOTE: this is experimental and will probably change.
     * Jupyter Server and JupyterLab doesn't implement a role-base access control (RBAC) yet.
     * This attribute is here to start introducing RBAC to JupyterLab's interface. At the moment every
     * user has the role ADMIN.
     */
    readonly role: IUser.ROLE;

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

  /**
   * @experimental
   * @alpha
   * @hidden
   *
   * User's roles.
   *
   * @note: this is experimental and will probably change.
   * @todo: define roles
   */
  export enum ROLE {
    /**
     * Can do everything RUN, modify settings, install extensions, etc.
     */
    ADMIN = 1,
    /**
     * Can only read documents.
     */
    READ = 2,
    /**
     * Can only read and write documents.
     */
    WRITE = 3,
    /**
     * Can READ, WRITE, execute documents, commands in the terminal and console.
     */
    RUN = 4
  }

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

  /**
   * Remove the item at a given index from the menu.
   *
   * @param index - The index of the item to remove.
   *
   * #### Notes
   * This is a no-op if the index is out of range.
   */
  removeItemAt(index: number): void;

  /**
   * Remove all menu items from the menu.
   */
  clearItems(): void;
}
