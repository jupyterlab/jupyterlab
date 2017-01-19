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
  IConsoleTracker
} from '../console';

import {
  INotebookTracker
} from '../notebook';

import {
  TooltipWidget
} from './index';


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
  const launch = 'tooltip:launch';
  const remove = 'tooltip:remove';
  const keymap = app.keymap;
  const registry = app.commands;
  let tooltip: TooltipWidget = null;
  let id = 0;

  // Add tooltip launch command.
  registry.addCommand(launch, {
    execute: args => {
      let notebook = args['notebook'] as boolean;
      let editor: CodeEditor.IEditor = null;
      let kernel: Kernel.IKernel = null;
      if (notebook) {
        let widget = notebooks.currentWidget;
        if (widget) {
          editor = widget.notebook.activeCell.editor;
          kernel = widget.kernel;
        }
      } else {
        let widget = consoles.currentWidget;
        if (widget) {
          editor = widget.console.prompt.editor;
          kernel = widget.console.session.kernel;
        }
      }
      if (tooltip) {
        tooltip.dispose();
      }
      if (editor) {
        tooltip = new TooltipWidget({ editor, kernel });
        tooltip.id = `tooltip-${++id}`;
        Widget.attach(tooltip, document.body);
        tooltip.activate();
        console.log('add tooltip for ' + (notebook ? 'notebook' : 'console'));
      }
    }
  });

  // Add tooltip remove command.
  registry.addCommand(remove, {
    execute: () => {
      if (tooltip) {
        tooltip.dispose();
      }
    }
  });

  // Add notebook tooltip key binding.
  keymap.addBinding({
    args: { notebook: true },
    command: launch,
    keys: ['Shift Tab'],
    selector: '.jp-Notebook'
  });

  // Add console tooltip key binding.
  keymap.addBinding({
    args: { notebook: false },
    command: launch,
    keys: ['Shift Tab'],
    selector: '.jp-ConsolePanel'
  });

  // Add tooltip removal key binding.
  keymap.addBinding({
    command: remove,
    keys: ['Escape'],
    selector: '.jp-Tooltip'
  });
}
