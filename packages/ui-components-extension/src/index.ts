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
  FormComponentRegistry,
  FormWidgetRegistry,
  IFormComponentRegistry,
  IFormWidgetRegistry,
  ILabIconManager
} from '@jupyterlab/ui-components';

/**
 * Placeholder for future extension that will provide an icon manager class
 * to assist with overriding/replacing particular sets of icons
 */
const labiconManager: JupyterFrontEndPlugin<ILabIconManager> = {
  id: '@jupyterlab/ui-components-extension:labicon-manager',
  provides: ILabIconManager,
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    return Object.create(null);
  }
};

/**
 * Sets up the component registry to be used by the FormEditor component.
 */
const registryPlugin: JupyterFrontEndPlugin<IFormComponentRegistry> = {
  id: '@jupyterlab/settingeditor-extension:form-registry',
  provides: IFormComponentRegistry,
  autoStart: true,
  activate: (app: JupyterFrontEnd): IFormComponentRegistry => {
    const editorRegistry = new FormComponentRegistry();
    return editorRegistry;
  }
};

/**
 * Sets up the widget registry to be used by a RJSF form.
 */
const widgetRegistryPlugin: JupyterFrontEndPlugin<IFormWidgetRegistry> = {
  id: '@jupyterlab/ui-components-extension:widget-registry',
  provides: IFormWidgetRegistry,
  autoStart: true,
  activate: (app: JupyterFrontEnd): IFormWidgetRegistry => {
    const formRegistry = new FormWidgetRegistry();
    return formRegistry;
  }
};

export default [labiconManager, registryPlugin, widgetRegistryPlugin];
