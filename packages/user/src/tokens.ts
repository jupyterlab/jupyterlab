// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Menu } from '@lumino/widgets';

import { Token } from '@lumino/coreutils';

export const IUserToken = new Token<IUser>('jupyterlab-auth:user');

export const IUserMenuToken = new Token<Menu>('jupyterlab-auth:userMenu');

export const IUserPanelToken = new Token<Menu>('jupyterlab-auth:userPanel');

export interface IUser {
  readonly name: string;
  readonly username: string;
  readonly initials: string;
  readonly color: string;
  readonly email?: string;
  readonly avatar?: string;

  readonly familyName?: string;
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

  readonly isAnonymous: boolean;
  //readonly isReady: boolean;
  //readonly ready: ISignal<IUser, boolean>;
  //readonly changed: ISignal<IUser, void>;

  //readonly logInMethods: string[];
  //registerLogInMethod(command: string): void;
}
