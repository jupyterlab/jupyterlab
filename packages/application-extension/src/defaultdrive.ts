// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  type Contents,
  Drive,
  IDefaultDrive,
  IServerSettings,
  ServerConnection
} from '@jupyterlab/services';
import type { IPlugin } from '@lumino/coreutils';

export const defaultDrive: IPlugin<null, Contents.IDrive> = {
  id: '@jupyterlab/application-extension:default-drive',
  description: 'Provides the default drive for the application contents.',
  provides: IDefaultDrive,
  optional: [IServerSettings],
  activate: (
    _: null,
    serverSettings: ServerConnection.ISettings | null
  ): Contents.IDrive => {
    return new Drive({ serverSettings: serverSettings ?? undefined });
  }
};
