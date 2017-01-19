// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

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
  const command = 'tooltip:launch';
  const keymap = app.keymap;
  const registry = app.commands;
  let id = 0;

  registry.addCommand(command, {
    execute: args => {
      let notebook = args['notebook'] as boolean;
      let editor: CodeEditor.IEditor | null = null;
      if (notebook) {
        let widget = notebooks.currentWidget;
        if (widget) {
          editor = widget.notebook.activeCell.editor;
        }
      } else {
        let widget = consoles.currentWidget;
        if (widget) {
          editor = widget.console.prompt.editor;
        }
      }
      if (editor) {
        let tooltip = new TooltipWidget({ editor });
        tooltip.id = `tooltip-${++id}`;
        Widget.attach(tooltip, document.body);
        tooltip.activate();
        console.log('add tooltip for ' + (notebook ? 'notebook' : 'console'));
      }
    }
  });
  keymap.addBinding({
    command,
    args: { notebook: true },
    keys: ['Shift Tab'],
    selector: '.jp-Notebook'
  });
  keymap.addBinding({
    command,
    args: { notebook: false },
    keys: ['Shift Tab'],
    selector: '.jp-ConsolePanel'
  });
  console.log('initialized tooltip plugin', consoles, notebooks);
}
