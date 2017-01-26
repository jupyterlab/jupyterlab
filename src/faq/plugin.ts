// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandLinker
} from '../commandlinker';

import {
  ICommandPalette
} from '../commandpalette';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  IInstanceRestorer
} from '../instancerestorer';

import {
  FaqModel, FaqWidget, CommandIDs
} from './';


/**
 * The FAQ page extension.
 */
const plugin: JupyterLabPlugin<void> = {
  activate,
  id: 'jupyter.extensions.faq',
  requires: [ICommandPalette, ICommandLinker, IInstanceRestorer],
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * Activate the FAQ plugin.
 */
function activate(app: JupyterLab, palette: ICommandPalette, linker: ICommandLinker, restorer: IInstanceRestorer): void {
  const category = 'Help';
  const command = CommandIDs.open;
  const model = new FaqModel();
  const tracker = new InstanceTracker<FaqWidget>({ namespace: 'faq' });

  // Handle state restoration.
  restorer.restore(tracker, {
    command,
    args: () => null,
    name: () => 'faq'
  });

  let widget: FaqWidget;

  function newWidget(): FaqWidget {
    let widget = new FaqWidget({ linker });
    widget.model = model;
    widget.id = 'faq';
    widget.title.label = 'FAQ';
    widget.title.closable = true;
    tracker.add(widget);
    return widget;
  }

  app.commands.addCommand(command, {
    label: 'Open FAQ',
    execute: () => {
      if (!widget || widget.isDisposed) {
        widget = newWidget();
        app.shell.addToMainArea(widget);
      }
      app.shell.activateMain(widget.id);
    }
  });

  palette.addItem({ command, category });
}
