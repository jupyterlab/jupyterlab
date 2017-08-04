// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, InstanceTracker
} from '@jupyterlab/apputils';

import {
  JSONExt
} from '@phosphor/coreutils';

import {
  Widget
} from '@phosphor/widgets';

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
 * The faq page source.
 */
const SOURCE = require('../faq.md');


/**
 * Activate the FAQ plugin.
 */
function activate(app: JupyterLab, palette: ICommandPalette, restorer: ILayoutRestorer): void {
  const category = 'Help';
  const command = CommandIDs.open;
  const { commands, shell, rendermime } = app;
  const tracker = new InstanceTracker<Widget>({
    namespace: 'faq',
    disposeOnDetach: true
  });

  // Handle state restoration.
  restorer.restore(tracker, {
    command,
    args: () => JSONExt.emptyObject,
    name: () => 'faq'
  });

  let createWidget = () => {
    let renderer = rendermime.createRenderer('text/markdown');
    renderer.id = 'faq';
    renderer.addClass('jp-FAQ');
    renderer.title.label = 'FAQ';
    renderer.title.closable = true;
    renderer.node.tabIndex = -1;

    const model = rendermime.createModel({
      data: { 'text/markdown': SOURCE }
    });
    renderer.renderModel(model);

    return renderer;
  };

  let widget = createWidget();

  commands.addCommand(command, {
    label: 'Open FAQ',
    execute: () => {
      if (widget.isDisposed) {
        widget = createWidget();
      }
      if (!tracker.has(widget)) {
        tracker.add(widget);
        shell.addToMainArea(widget);
      }
      shell.activateById(widget.id);
    }
  });

  palette.addItem({ command, category });
}
