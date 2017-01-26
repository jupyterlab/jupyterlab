// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel
} from '@jupyterlab/services';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  CodeEditor
} from '../codeeditor';

import {
  ConsolePanel, IConsoleTracker
} from '../console';

import {
  INotebookTracker, NotebookPanel
} from '../notebook';

import {
  IRenderMime
} from '../rendermime';

import {
  CommandIDs, TooltipModel, TooltipWidget
} from './';


/**
 * The tooltip extension.
 */
const plugin: JupyterLabPlugin<void> = {
  activate,
  id: 'jupyter.extensions.tooltip',
  autoStart: true,
  requires: [IConsoleTracker, INotebookTracker]
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * Activate the tooltip.
 */
function activate(app: JupyterLab, consoles: IConsoleTracker, notebooks: INotebookTracker): void {
  const registry = app.commands;
  let tooltip: TooltipWidget = null;

  // Add tooltip launch command.
  registry.addCommand(CommandIDs.launch, {
    execute: args => {
      const notebook = args['notebook'] as boolean;
      let anchor: Widget | null = null;
      let editor: CodeEditor.IEditor | null = null;
      let kernel: Kernel.IKernel | null = null;
      let rendermime: IRenderMime | null = null;
      let parent: NotebookPanel | ConsolePanel | null = null;

      // If a tooltip is open, remove it.
      if (tooltip) {
        tooltip.model.dispose();
        tooltip.dispose();
        tooltip = null;
      }

      if (notebook) {
        parent = notebooks.currentWidget;
        if (parent) {
          anchor = parent.notebook;
          editor = parent.notebook.activeCell.editor;
          kernel = parent.kernel;
          rendermime = parent.rendermime;
        }
      } else {
        parent = consoles.currentWidget;
        if (parent) {
          anchor = parent.console;
          editor = parent.console.prompt.editor;
          kernel = parent.console.session.kernel;
          rendermime = parent.console.rendermime;
        }
      }

      // If all components necessary for rendering exist, create a tooltip.
      let ready = !!editor && !!kernel && !!rendermime;

      if (!ready) {
        return;
      }

      const model = new TooltipModel({ editor, kernel, rendermime });

      tooltip = new TooltipWidget({ anchor, model });
      Widget.attach(tooltip, document.body);

      // Make sure the parent notebook/console still has the focus.
      parent.activate();
    }
  });

}
