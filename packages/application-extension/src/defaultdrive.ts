// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  type JupyterFrontEnd,
  type JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { type Contents, Drive, IDefaultDrive } from '@jupyterlab/services';

export const defaultDrive: JupyterFrontEndPlugin<Contents.IDrive> = {
  id: '@jupyterlab/application-extension:default-drive',
  description: 'Provides the default drive for the application contents.',
  provides: IDefaultDrive,
  activate: (app: JupyterFrontEnd): Contents.IDrive => {
    return new Drive();
  }
};
