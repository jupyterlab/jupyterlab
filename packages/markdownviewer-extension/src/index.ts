// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ILayoutRestorer
} from '@jupyterlab/apputils';

import {
  InstanceTracker
} from '@jupyterlab/coreutils';

import {
  IDocumentRegistry
} from '@jupyterlab/docregistry';

import {
  IRenderMime
} from '@jupyterlab/rendermime';

import {
  MarkdownViewer, MarkdownViewerFactory
} from '@jupyterlab/markdownviewer';


/**
 * The class name for the text editor icon from the default theme.
 */
const TEXTEDITOR_ICON_CLASS = 'jp-ImageTextEditor';

/**
 * The name of the factory that creates markdown widgets.
 */
const FACTORY = 'Rendered Markdown';


/**
 * The markdown handler extension.
 */
const plugin: JupyterLabPlugin<void> = {
  activate,
  id: 'jupyter.extensions.rendered-markdown',
  requires: [IDocumentRegistry, IRenderMime, ILayoutRestorer],
  autoStart: true
};


/**
 * Activate the markdown plugin.
 */
function activate(app: JupyterLab, registry: IDocumentRegistry, rendermime: IRenderMime, restorer: ILayoutRestorer) {
    const factory = new MarkdownViewerFactory({
      name: FACTORY,
      fileExtensions: ['.md'],
      readOnly: true,
      rendermime
    });
    const namespace = 'rendered-markdown';
    const tracker = new InstanceTracker<MarkdownViewer>({ namespace });

    // Handle state restoration.
    restorer.restore(tracker, {
      command: 'file-operations:open',
      args: widget => ({ path: widget.context.path, factory: FACTORY }),
      name: widget => widget.context.path
    });

    factory.widgetCreated.connect((sender, widget) => {
      widget.title.icon = TEXTEDITOR_ICON_CLASS;
      // Notify the instance tracker if restore data needs to update.
      widget.context.pathChanged.connect(() => { tracker.save(widget); });
      tracker.add(widget);
    });

    registry.addWidgetFactory(factory);
  }


/**
 * Export the plugin as default.
 */
export default plugin;
