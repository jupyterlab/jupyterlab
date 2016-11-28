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
  ILayoutRestorer
} from '../layoutrestorer';

import {
  IStateDB
} from '../statedb';

import {
  FaqModel, FaqWidget
} from './widget';


/**
 * The FAQ page extension.
 */
export
const faqExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.faq',
  requires: [ICommandPalette, ICommandLinker, IStateDB, ILayoutRestorer],
  activate: activateFAQ,
  autoStart: true
};


/**
 * Activate the FAQ plugin.
 */
function activateFAQ(app: JupyterLab, palette: ICommandPalette, linker: ICommandLinker, state: IStateDB, layout: ILayoutRestorer): void {
  const category = 'Help';
  const command = 'faq-jupyterlab:show';
  const model = new FaqModel();
  const tracker = new InstanceTracker<FaqWidget>({
    restore: {
      state, layout, command,
      args: widget => null,
      name: widget => 'faq',
      namespace: 'faqs',
      when: app.started,
      registry: app.commands
    }
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
    label: 'Frequently Asked Questions',
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
