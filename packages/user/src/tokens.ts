// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Menu, AccordionPanel } from '@lumino/widgets';
import { ISignal } from '@lumino/signaling';
import { Token } from '@lumino/coreutils';

export const USER = '@jupyterlab/user-extension:user';

export const ICurrentUser = new Token<IUser>('jupyterlab-auth:user');

export const IUserMenu = new Token<Menu>('jupyterlab-auth:userMenu');

export const IUserPanel = new Token<AccordionPanel>('jupyterlab-auth:userPanel');

export interface IUser {
  readonly id: string;
  readonly username: string;
  readonly color: string;
  readonly anonymous: boolean;
  readonly role: IUser.ROLE;
  readonly cursor?: IUser.Cursor;

  readonly name?: string;
  readonly familyName?: string;
  readonly email?: string;
  readonly avatar_url?: string;
  readonly birthDate?: Date;
  readonly gender?: string;
  readonly honorificPrefix?: string;
  readonly honorificSuffix?: string;
  readonly nationality?: string;
  readonly affiliation?: string;
  readonly jobTitle?: string;
  readonly telephone?: string;
  readonly address?: string;
  readonly description?: string;

  readonly isReady: boolean;
  readonly ready: ISignal<IUser, boolean>;
  readonly changed: ISignal<IUser, void>;

  fromJSON(user: IUser.User): void;
  toJSON(): IUser.User;
}

export namespace IUser {
  export type User = {
    id: string;
    username: string;
    color: string;
    anonymous: boolean;
    role: ROLE;
    cursor?: Cursor;

    name?: string;
    familyName?: string;
    email?: string;
    avatar_url?: string;
    birthDate?: string;
    gender?: string;
    honorificPrefix?: string;
    honorificSuffix?: string;
    nationality?: string;
    affiliation?: string;
    jobTitle?: string;
    telephone?: string;
    address?: string;
    description?: string;
  };

  // TODO: define roles
  export enum ROLE {
    read = 'user:read',
    write = 'user:write',
    execute = 'user:execute',
    admin = 'sys'
  }

  export type Cursor = {
    cell: number;
    index: number;
  }
}
