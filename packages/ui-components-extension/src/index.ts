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
import { CodeBlock } from '@jupyterlab/codeeditor';
import {
  ArrayInput,
  CheckBox,
  DropDown,
  FormComponentRegistry,
  IFormComponentRegistry,
  ILabIconManager,
  TextInput
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
  id: '@jupyterlab/settingeditor-extension:registry-plugin',
  provides: IFormComponentRegistry,
  autoStart: true,
  activate: (app: JupyterFrontEnd): IFormComponentRegistry => {
    const editorRegistry = new FormComponentRegistry();
    editorRegistry.addRenderer('textinput', TextInput);
    editorRegistry.addRenderer('object', CodeBlock);
    editorRegistry.addRenderer('number', TextInput);
    editorRegistry.addRenderer('integer', TextInput);
    editorRegistry.addRenderer('string', TextInput);
    editorRegistry.addRenderer('dropdown', DropDown);
    editorRegistry.addRenderer('boolean', CheckBox);
    editorRegistry.addRenderer('array', ArrayInput);
    return editorRegistry;
  }
};

export default [labiconManager, registryPlugin];
