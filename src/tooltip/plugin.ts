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
  BaseCellWidget
} from '../notebook/cells';

import {
  IRenderMime
} from '../rendermime';

import {
  TooltipModel
} from './model';

import {
  TooltipWidget
} from './widget';


/**
 * The class added to cells that have spawned a tooltip.
 */
const PARENT_CLASS = 'jp-Tooltip-parent';

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
      let cell: BaseCellWidget | null = null;
      let editor: CodeEditor.IEditor | null = null;
      let kernel: Kernel.IKernel | null = null;
      let rendermime: IRenderMime | null = null;
      let extant = !!tooltip;
      let parent: NotebookPanel | ConsolePanel | null = null;

      if (notebook) {
        parent = notebooks.currentWidget;
        if (parent) {
          cell = parent.notebook.activeCell;
          editor = cell.editor;
          kernel = parent.kernel;
          rendermime = parent.rendermime;
        }
      } else {
        parent = consoles.currentWidget;
        if (parent) {
          cell = parent.console.prompt;
          editor = cell.editor;
          kernel = parent.console.session.kernel;
          rendermime = parent.console.rendermime;
        }
      }

      // Dispose extant tooltip and model.
      if (extant) {
        tooltip.model.dispose();
        tooltip.dispose();
        tooltip = null;
      }

      // If all components necessary for rendering exist, create a tooltip.
      let ready = !!editor && !!kernel && !!rendermime;
      if (ready) {
        tooltip = new TooltipWidget({
          model: new TooltipModel({ editor, kernel, rendermime })
        });
        cell.addClass(PARENT_CLASS);
        tooltip.id = `tooltip-${++id}`;
        Widget.attach(tooltip, document.body);
        // Make sure the parent notebook/console still has the focus.
        parent.activate();
      }
    }
  });

  // Add tooltip remove command.
  registry.addCommand(remove, {
    execute: () => {
      if (tooltip) {
        let parent = document.querySelector(`.${PARENT_CLASS}`);
        if (parent) {
          parent.classList.remove(PARENT_CLASS);
        }
        tooltip.model.dispose();
        tooltip.dispose();
        tooltip = null;
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
    selector: `.jp-Cell.${PARENT_CLASS}, .jp-Tooltip`
  });
}
