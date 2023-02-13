// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module celltags-extension
 */

import type { FieldProps } from '@rjsf/utils';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { INotebookTools, INotebookTracker } from '@jupyterlab/notebook';

import { TagTool } from '@jupyterlab/celltags';

import { ITranslator } from '@jupyterlab/translation';

import { CellTagField } from './celltag';
import {
  IFormRenderer,
  IFormRendererRegistry
} from '@jupyterlab/ui-components';

/**
 * Initialization data for the celltags extension.
 */
const celltags: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/celltags',
  autoStart: true,
  requires: [INotebookTools, INotebookTracker, ITranslator],
  activate: (
    app: JupyterFrontEnd,
    tools: INotebookTools,
    tracker: INotebookTracker,
    translator: ITranslator
  ) => {
    const tool = new TagTool(tracker, app, translator);
    tools.addItem({ tool: tool, rank: 1.6 });
  }
};

/**
 * Registering cell tag field.
 */
const customCellTag: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/celltags-extension:plugin',
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
      formRegistry.addRenderer('celltags-extension:plugin.renderer', component);
    }
  }
};

export default [celltags, customCellTag];
