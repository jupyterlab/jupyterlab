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
  FaqModel, FaqWidget
} from './widget';


/**
 * The FAQ page extension.
 */
export
const faqExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.faq',
  requires: [ICommandPalette, ICommandLinker],
  activate: activateFAQ,
  autoStart: true
};


/**
 * Activate the faq plugin.
 */
function activateFAQ(app: JupyterLab, palette: ICommandPalette, linker: ICommandLinker): void {
  let faqModel = new FaqModel();
  let widget = new FaqWidget({ linker });
  let commandId = 'faq-jupyterlab:show';
  widget.model = faqModel;
  widget.id = 'faq-jupyterlab';
  widget.title.label = 'FAQ';
  widget.title.closable = true;
  widget.node.style.overflowY = 'auto';

  app.commands.addCommand(commandId, {
    label: 'Frequently Asked Questions',
    execute: () => {
      if (!widget.isAttached) {
        app.shell.addToMainArea(widget);
      }
      app.shell.activateMain(widget.id);
    }
  });

  palette.addItem({ command: commandId, category: 'Help' });
}
