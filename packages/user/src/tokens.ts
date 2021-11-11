// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { AccordionPanel, Menu } from '@lumino/widgets';
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
export const ICurrentUser = new Token<IUser>('@jupyterlab/user:user');

/**
 * The user menu token.
 *
 * NOTE: Requirer this token in your extension to access the user menu
 * (top-right menu in JupyterLab's interface).
 */
export const IUserMenu = new Token<Menu>('@jupyterlab/user:userMenu');

/**
 * The user panel token.
 *
 * NOTE: The left side bar panel. Useful to add user related widgets.
 */
export const IUserPanel = new Token<AccordionPanel>(
  '@jupyterlab/user:userPanel'
);

/**
 * An interface describing an user.
 */
export interface IUser {
  /**
   * User's unique identifier.
   */
  readonly id: string;

  /**
   * User's name.
   */
  readonly name: string;

  /**
   * User's Username.
   */
  readonly username: string;

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
   * User's role.
   *
   * NOTE: Jupyter Server and JupyterLab doesn't implement a role-base access control (RBAC) yet.
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
   * User's family name.
   */
  readonly familyName?: string;

  /**
   * User's email.
   */
  readonly email?: string;

  /**
   * User's avatar url.
   * The url to the user's image for the icon.
   */
  readonly avatar_url?: string;

  /**
   * User's birth date.
   */
  readonly birthDate?: Date;

  /**
   * User's gender.
   */
  readonly gender?: string;

  /**
   * User's honorific prefix.
   */
  readonly honorificPrefix?: string;

  /**
   * User's honorific suffix.
   */
  readonly honorificSuffix?: string;

  /**
   * User's nationality.
   */
  readonly nationality?: string;

  /**
   * User's affiliation.
   */
  readonly affiliation?: string;

  /**
   * User's job title.
   */
  readonly jobTitle?: string;

  /**
   * User's telephone.
   */
  readonly telephone?: string;

  /**
   * User's address.
   */
  readonly address?: string;

  /**
   * User's description.
   */
  readonly description?: string;

  /**
   * Whether the user information is loaded or not.
   */
  readonly isReady: boolean;

  /**
   * Signal emitted when the user's information is ready.
   */
  readonly ready: ISignal<IUser, boolean>;

  /**
   * Signal emitted when the user's information changes.
   */
  readonly changed: ISignal<IUser, void>;

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
    id: string;

    /**
     * User's name.
     */
    name: string;

    /**
     * User's Username.
     */
    username: string;

    /**
     * User's cursor color and icon color if avatar_url is undefined
     * (there is no image).
     */
    color: string;

    /**
     * Whether the user is anonymous or not.
     *
     * NOTE: Jupyter server doesn't handle user's identity so, by default every user
     * is anonymous unless a third-party extension provides the ICurrentUser token retrieving
     * the user identity from a third-party identity provider as GitHub, Google, etc.
     */
    anonymous: boolean;

    /**
     * User's role.
     *
     * A user can have the following roles:
     *  - ADMIN: can
     *  - READ:
     *  - WRITE:
     *  - RUN:
     *
     * NOTE: Jupyter Server and JupyterLab doesn't implement a role-base access control (RBAC) yet.
     * This attribute is here to start introducing RBAC to JupyterLab's interface. At the moment every
     * user has the role ADMIN.
     */
    role: IUser.ROLE;

    /**
     * User's cursor position on the document.
     *
     * If undefined, the user is not on a document.
     */
    cursor?: IUser.Cursor;

    /**
     * User's family name.
     */
    familyName?: string;

    /**
     * User's email.
     */
    email?: string;

    /**
     * User's avatar url.
     * The url to the user's image for the icon.
     */
    avatar_url?: string;

    /**
     * User's birth date.
     */
    birthDate?: string;

    /**
     * User's gender.
     */
    gender?: string;

    /**
     * User's honorific prefix.
     */
    honorificPrefix?: string;

    /**
     * User's honorific suffix.
     */
    honorificSuffix?: string;

    /**
     * User's nationality.
     */
    nationality?: string;

    /**
     * User's affiliation.
     */
    affiliation?: string;

    /**
     * User's job title.
     */
    jobTitle?: string;

    /**
     * User's telephone.
     */
    telephone?: string;

    /**
     * User's address.
     */
    address?: string;

    /**
     * User's description.
     */
    description?: string;
  };

  /**
   * User's roles.
   *
   * TODO: define roles
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
