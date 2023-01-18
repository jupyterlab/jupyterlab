import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { INotebookTracker } from '@jupyterlab/notebook';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { IWidgetTracker } from '@jupyterlab/apputils';
import { IDocumentWidget } from '@jupyterlab/docregistry';

import {
  buildNotebookShortcutCommand,
  buildDefaultInserter,
  buildNotebookInserter,
  buildOpenTaskDialog
} from './commands';
import { psychologyIcon } from './icons';
import { getTextSelection } from './utils';

export enum NotebookTasks {
  GenerateCode = 'gpt3:generate-code-in-cells-below',
  ExplainCode = 'gpt3:explain-code-in-cells-above'
}

export namespace CommandIDs {
  export const explainCodeCell = 'gai:explain-code-cell';
  export const codifyMdCell = 'gai:codify-md-cell';
  export const explainOrCodifyCell = 'gai:explain-or-codify-cell';
  export const generateFromNotebookSelection =
    'gai:generate-from-notebook-selection';
  export const generateFromEditorSelection =
    'gai:generate-from-editor-selection';
  export const insertAbove = 'gai:insert-above';
  export const insertBelow = 'gai:insert-below';
  export const insertReplace = 'gai:insert-replace';
  export const insertAboveInCells = 'gai:insert-above-in-cells';
  export const insertBelowInCells = 'gai:insert-below-in-cells';
}

export type DocumentTracker = IWidgetTracker<IDocumentWidget>;

/**
 * Initialization data for the jupyter_gai extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyter_gai:plugin',
  autoStart: true,
  requires: [INotebookTracker, IEditorTracker],
  activate: (
    app: JupyterFrontEnd,
    notebookTracker: INotebookTracker,
    editorTracker: IEditorTracker
  ) => {
    const { commands } = app;

    /**
     * Register core commands
     */
    commands.addCommand(CommandIDs.generateFromNotebookSelection, {
      execute: buildOpenTaskDialog(notebookTracker, app),
      label: 'Generate output from selection with GAI...',
      icon: psychologyIcon,
      isEnabled: () => {
        const editorWidget = notebookTracker?.currentWidget?.content;
        return !!(editorWidget && getTextSelection(editorWidget));
      }
    });
    commands.addCommand(CommandIDs.generateFromEditorSelection, {
      execute: buildOpenTaskDialog(editorTracker, app),
      label: 'Generate output from selection with GAI...',
      icon: psychologyIcon,
      isEnabled: () => {
        const editorWidget = editorTracker?.currentWidget?.content;
        return !!(editorWidget && getTextSelection(editorWidget));
      }
    });

    /**
     * Register inserters
     */
    // default inserters
    commands.addCommand(CommandIDs.insertAbove, {
      execute: buildDefaultInserter('above') as any
    });
    commands.addCommand(CommandIDs.insertBelow, {
      execute: buildDefaultInserter('below') as any
    });
    commands.addCommand(CommandIDs.insertReplace, {
      execute: buildDefaultInserter('replace') as any
    });
    // gpt3 inserters
    commands.addCommand(CommandIDs.insertAboveInCells, {
      execute: buildNotebookInserter('above-in-cells') as any
    });
    commands.addCommand(CommandIDs.insertBelowInCells, {
      execute: buildNotebookInserter('below-in-cells') as any
    });

    /**
     * Register notebook shortcuts
     */
    commands.addCommand(CommandIDs.explainCodeCell, {
      execute: buildNotebookShortcutCommand(notebookTracker, app),
      label: 'Explain cell with GAI',
      icon: psychologyIcon
    });
    commands.addCommand(CommandIDs.codifyMdCell, {
      execute: buildNotebookShortcutCommand(notebookTracker, app),
      label: 'Codify cell with GAI',
      icon: psychologyIcon
    });
    commands.addCommand(CommandIDs.explainOrCodifyCell, {
      execute: buildNotebookShortcutCommand(notebookTracker, app),
      label: 'Explain or codify cell with GAI',
      icon: psychologyIcon
    });
  }
};

export default plugin;
