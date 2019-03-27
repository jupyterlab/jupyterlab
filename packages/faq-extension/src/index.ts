// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette,
  InstanceTracker,
  MainAreaWidget
} from '@jupyterlab/apputils';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { JSONExt } from '@phosphor/coreutils';

import '../style/index.css';

/**
 * The command IDs used by the FAQ plugin.
 */
namespace CommandIDs {
  export const open: string = 'faq-jupyterlab:open';
}

/**
 * The FAQ page extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  activate,
  id: '@jupyterlab/faq-extension:plugin',
  requires: [IRenderMimeRegistry],
  optional: [ICommandPalette, ILayoutRestorer],
  autoStart: true
};

/**
 * Export the plugin as default.
 */
export default plugin;

/* tslint:disable */
/**
 * The faq page source.
 */
const SOURCE = require('../faq.md');
/* tslint:enable */

/**
 * Activate the FAQ plugin.
 */
function activate(
  app: JupyterFrontEnd,
  rendermime: IRenderMimeRegistry,
  palette: ICommandPalette | null,
  restorer: ILayoutRestorer | null
): void {
  const category = 'Help';
  const command = CommandIDs.open;
  const { commands, shell } = app;
  const tracker = new InstanceTracker<MainAreaWidget>({ namespace: 'faq' });

  // Handle state restoration.
  if (restorer) {
    restorer.restore(tracker, {
      command,
      args: () => JSONExt.emptyObject,
      name: () => 'faq'
    });
  }

  let createWidget = () => {
    let content = rendermime.createRenderer('text/markdown');
    const model = rendermime.createModel({
      data: { 'text/markdown': SOURCE }
    });
    void content.renderModel(model);
    content.addClass('jp-FAQ-content');
    let widget = new MainAreaWidget({ content });
    widget.addClass('jp-FAQ');
    widget.title.label = 'FAQ';
    return widget;
  };

  let widget: MainAreaWidget;

  commands.addCommand(command, {
    label: 'Open FAQ',
    execute: () => {
      if (!widget || widget.isDisposed) {
        widget = createWidget();
      }
      if (!tracker.has(widget)) {
        void tracker.add(widget);
        shell.add(widget, 'main', { activate: false });
      }
      shell.activateById(widget.id);
    }
  });

  if (palette) {
    palette.addItem({ command, category });
  }
}
