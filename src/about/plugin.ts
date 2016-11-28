// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  ILayoutRestorer
} from '../layoutrestorer';

import {
  IStateDB
} from '../statedb';

import {
  AboutModel, AboutWidget
} from './';

/**
 * The about page extension.
 */
export
const aboutExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.about',
  activate: activateAbout,
  autoStart: true,
  requires: [ICommandPalette, IStateDB, ILayoutRestorer]
};


function activateAbout(app: JupyterLab, palette: ICommandPalette, state: IStateDB, layout: ILayoutRestorer): void {
  const model = new AboutModel();
  const command = 'about-jupyterlab:show';
  const category = 'Help';
  const tracker = new InstanceTracker<AboutWidget>({
    restore: {
      state, layout, command,
      args: widget => null,
      name: widget => 'about',
      namespace: 'abouts',
      when: app.started,
      registry: app.commands
    }
  });

  let widget: AboutWidget;

  function newWidget(): AboutWidget {
    let widget = new AboutWidget();
    widget.model = model;
    widget.id = 'about';
    widget.title.label = 'About';
    widget.title.closable = true;
    tracker.add(widget);
    return widget;
  }

  app.commands.addCommand(command, {
    label: 'About JupyterLab',
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
