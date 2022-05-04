import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { INotebookTracker } from '@jupyterlab/notebook';

import { CommandEntryPoint } from '../../command_manager';
import {
  IAdapterTypeOptions,
  ILSPAdapterManager,
  PLUGIN_ID
} from '../../tokens';

import { NotebookAdapter } from './notebook';

export const CellContextMenuEntryPoint: CommandEntryPoint =
  'notebook-cell-context-menu';
export const NOTEBOOK_ADAPTER: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID + ':NotebookAdapter',
  requires: [ILSPAdapterManager, INotebookTracker],
  activate(
    app,
    adapterManager: ILSPAdapterManager,
    notebookTracker: INotebookTracker
  ) {
    adapterManager.registerAdapterType({
      name: 'notebook',
      tracker: notebookTracker,
      adapter: NotebookAdapter,
      entrypoint: CellContextMenuEntryPoint,
      get_id(widget: IDocumentWidget): string {
        // TODO can we use id instead of content.id?
        return widget.content.id;
      },
      context_menu: {
        selector: '.jp-Notebook .jp-CodeCell .jp-Editor',
        // position context menu entries after 10th but before 11th default entry
        // this lets it be before "Clear outputs" which is the last entry of the
        // CodeCell contextmenu and plays nicely with the first notebook entry
        // ('Clear all outputs') thus should stay as the last one.
        // see https://github.com/blink1073/jupyterlab/blob/3592afd328116a588e3307b4cdd9bcabc7fe92bb/packages/notebook-extension/src/index.ts#L802
        // TODO: PR bumping rank of clear all outputs instead?
        // adding a very small number (epsilon) places the group just after 10th entry
        rank_group: 10 + Number.EPSILON,
        // the group size is increased by one to account for separator,
        // and by another one to prevent exceeding 11th rank by epsilon.
        // TODO hardcoded space for 2 commands only!
        rank_group_size: 2 + 2,
        callback(manager) {
          manager.add_context_separator(0);
        }
      }
    } as IAdapterTypeOptions<IDocumentWidget>);
  },
  autoStart: true
};
