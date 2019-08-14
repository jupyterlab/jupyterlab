// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IIconRegistry, defaultIconRegistry } from '@jupyterlab/ui-components';

const iconRegistry: JupyterFrontEndPlugin<IIconRegistry> = {
  id: '@jupyterlab/ui-components-extension:default-icon-registry',
  provides: IIconRegistry,
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    return defaultIconRegistry;
  }
};

export default iconRegistry;
