// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, InstanceTracker
} from '@jupyterlab/apputils';

import {
  FaqModel, FaqWidget
} from './widget';

import '../style/index.css';

/**
 * The command IDs used by the FAQ plugin.
 */
namespace CommandIDs {
  export
  const open: string = 'faq-jupyterlab:open';
};


/**
 * The FAQ page extension.
 */
const plugin: JupyterLabPlugin<void> = {
  activate,
  id: 'jupyter.extensions.faq',
  requires: [ICommandPalette, ILayoutRestorer],
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * Activate the FAQ plugin.
 */
function activate(app: JupyterLab, palette: ICommandPalette, restorer: ILayoutRestorer): void {
  const category = 'Help';
  const command = CommandIDs.open;
  const model = new FaqModel();
  const { commands, shell } = app;
  const tracker = new InstanceTracker<FaqWidget>({ namespace: 'faq' });

  // Handle state restoration.
  restorer.restore(tracker, {
    command,
    args: () => null,
    name: () => 'faq'
  });

  let widget: FaqWidget;

  function newWidget(): FaqWidget {
    let widget = new FaqWidget({ linker: app.commandLinker });
    widget.model = model;
    widget.id = 'faq';
    widget.title.label = 'FAQ';
    widget.title.closable = true;
    tracker.add(widget);
    return widget;
  }

  commands.addCommand(command, {
    label: 'Open FAQ',
    execute: () => {
      if (!widget || widget.isDisposed) {
        widget = newWidget();
        shell.addToMainArea(widget);
      }
      shell.activateById(widget.id);
    }
  });

  palette.addItem({ command, category });
}
