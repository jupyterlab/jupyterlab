/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  createDefaultFactory,
  IToolbarWidgetRegistry,
  ToolbarWidgetRegistry
} from '@jupyterlab/apputils';

/**
 * The default toolbar registry.
 */
export const toolbarRegistry: JupyterFrontEndPlugin<IToolbarWidgetRegistry> = {
  id: '@jupyterlab/apputils-extension:toolbar-registry',
  description: 'Provides toolbar items registry.',
  autoStart: true,
  provides: IToolbarWidgetRegistry,
  activate: (app: JupyterFrontEnd) => {
    const registry = new ToolbarWidgetRegistry({
      defaultFactory: createDefaultFactory(app.commands)
    });
    return registry;
  }
};
