// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module celltags-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { CellTagField, INotebookTracker } from '@jupyterlab/notebook';

import {
  IFormRenderer,
  IFormRendererRegistry
} from '@jupyterlab/ui-components';

import type { FieldProps } from '@rjsf/utils';

/**
 * Registering cell tag field.
 */
const customCellTag: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/celltags-extension:plugin',
  description: 'Adds the cell tags editor.',
  autoStart: true,
  requires: [INotebookTracker],
  optional: [IFormRendererRegistry],
  activate: (
    app: JupyterFrontEnd,
    tracker: INotebookTracker,
    formRegistry?: IFormRendererRegistry
  ) => {
    // Register the custom field
    if (formRegistry) {
      const component: IFormRenderer = {
        fieldRenderer: (props: FieldProps) => {
          return new CellTagField(tracker).render(props);
        }
      };
      formRegistry.addRenderer(
        '@jupyterlab/celltags-extension:plugin.renderer',
        component
      );
    }
  }
};

export default [customCellTag];
