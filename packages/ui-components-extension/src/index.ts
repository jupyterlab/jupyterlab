// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module ui-components-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  FormRendererRegistry,
  IFormRendererRegistry,
  ILabIconManager
} from '@jupyterlab/ui-components';

/**
 * Placeholder for future extension that will provide an icon manager class
 * to assist with overriding/replacing particular sets of icons
 */
const labiconManager: JupyterFrontEndPlugin<ILabIconManager> = {
  id: '@jupyterlab/ui-components-extension:labicon-manager',
  description: 'Provides the icon manager.',
  provides: ILabIconManager,
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    return Object.create(null);
  }
};

/**
 * Sets up the renderer registry to be used by the FormEditor component.
 */
const formRendererRegistryPlugin: JupyterFrontEndPlugin<IFormRendererRegistry> =
  {
    id: '@jupyterlab/ui-components-extension:form-renderer-registry',
    description: 'Provides the settings form renderer registry.',
    provides: IFormRendererRegistry,
    autoStart: true,
    activate: (app: JupyterFrontEnd): IFormRendererRegistry => {
      const formRendererRegistry = new FormRendererRegistry();
      return formRendererRegistry;
    }
  };

export default [labiconManager, formRendererRegistryPlugin];
