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

import { CustomCellTag } from './celltag';
import { IFormComponentRegistry } from '@jupyterlab/ui-components';

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
  optional: [IFormComponentRegistry],
  activate: (
    app: JupyterFrontEnd,
    tracker: INotebookTracker,
    formRegistry?: IFormComponentRegistry
  ) => {
    // Register the custom field
    if (formRegistry) {
      formRegistry.addRenderer('custom-cellTag', (props: FieldProps) => {
        return new CustomCellTag(tracker).render(props);
      });
    }
  }
};

export default [celltags, customCellTag];
