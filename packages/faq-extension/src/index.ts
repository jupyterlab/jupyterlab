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
  Message
} from '@phosphor/messaging';

import {
  PanelLayout, Widget
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
 * A widget which is an faq viewer.
 */
class FAQWidget extends Widget {
  /**
   * Construct a new `AppWidget`.
   */
  constructor(content: Widget) {
    super();
    this.addClass('jp-FAQ');
    this.title.closable = true;
    this.node.tabIndex = -1;
    this.id = 'faq';
    this.title.label = 'FAQ';

    let toolbar = new Widget();
    toolbar.addClass('jp-FAQ-toolbar');

    let layout = this.layout = new PanelLayout();
    layout.addWidget(toolbar);
    layout.addWidget(content);
  }

  /**
   * Handle `close-request` events for the widget.
   */
  onCloseRequest(message: Message): void {
    this.dispose();
  }

  /**
   * Handle `activate-request` events for the widget.
   */
  onActivateRequest(message: Message): void {
    this.node.focus();
  }
}


/**
 * Activate the FAQ plugin.
 */
function activate(app: JupyterLab, palette: ICommandPalette, restorer: ILayoutRestorer): void {
  const category = 'Help';
  const command = CommandIDs.open;
  const { commands, shell, rendermime } = app;
  const tracker = new InstanceTracker<Widget>({ namespace: 'faq' });

  // Handle state restoration.
  restorer.restore(tracker, {
    command,
    args: () => JSONExt.emptyObject,
    name: () => 'faq'
  });

  let createWidget = () => {
    let content = rendermime.createRenderer('text/markdown');
    const model = rendermime.createModel({
      data: { 'text/markdown': SOURCE }
    });
    content.renderModel(model);
    content.addClass('jp-FAQ-content');
    return new FAQWidget(content);
  };

  let widget: FAQWidget;

  commands.addCommand(command, {
    label: 'Open FAQ',
    execute: () => {
      if (!widget || widget.isDisposed) {
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
