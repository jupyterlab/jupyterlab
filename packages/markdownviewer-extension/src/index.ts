// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  InstanceTracker
} from '@jupyterlab/apputils';

import {
  MimeDocumentFactory, MimeDocument
} from '@jupyterlab/docregistry';


import '../style/index.css';

/**
 * The class name for the text editor icon from the default theme.
 */
const TEXTEDITOR_ICON_CLASS = 'jp-TextEditorIcon';

/**
 * The name of the factory that creates markdown widgets.
 */
const FACTORY = 'Markdown Preview';


/**
 * The command IDs used by the document manager plugin.
 */
namespace CommandIDs {
  export
  const preview = 'markdownviewer:open';
}


/**
 * The markdown handler extension.
 */
const plugin: JupyterLabPlugin<void> = {
  activate,
  id: 'jupyter.extensions.rendered-markdown',
  requires: [ILayoutRestorer],
  autoStart: true
};


/**
 * Activate the markdown plugin.
 */
function activate(app: JupyterLab, restorer: ILayoutRestorer) {
    const factory = new MimeDocumentFactory({
      name: FACTORY,
      fileExtensions: ['.md'],
      mimeType: 'text/markdown',
      rendermime: app.rendermime
    });
    app.docRegistry.addWidgetFactory(factory);

    const { commands } = app;
    const namespace = 'rendered-markdown';
    const tracker = new InstanceTracker<MimeDocument>({ namespace });

    // Handle state restoration.
    restorer.restore(tracker, {
      command: 'docmanager:open',
      args: widget => ({ path: widget.context.path, factory: FACTORY }),
      name: widget => widget.context.path
    });

    factory.widgetCreated.connect((sender, widget) => {
      widget.title.icon = TEXTEDITOR_ICON_CLASS;
      // Notify the instance tracker if restore data needs to update.
      widget.context.pathChanged.connect(() => { tracker.save(widget); });
      tracker.add(widget);
    });

    commands.addCommand(CommandIDs.preview, {
      label: 'Markdown Preview',
      execute: (args) => {
        let path = args['path'];
        if (typeof path !== 'string') {
          return;
        }
        return commands.execute('docmanager:open', {
          path, factory: FACTORY
        });
      }
    });
  }


/**
 * Export the plugin as default.
 */
export default plugin;
