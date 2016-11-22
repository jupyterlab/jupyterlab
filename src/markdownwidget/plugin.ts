// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  IDocumentRegistry
} from '../docregistry';

import {
  IRenderMime
} from '../rendermime';

import {
  IStateDB
} from '../statedb';

import {
  MarkdownWidget, MarkdownWidgetFactory
} from './widget';


/**
 * The class name for all main area portrait tab icons.
 */
const PORTRAIT_ICON_CLASS = 'jp-MainAreaPortraitIcon';

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
export
const markdownHandlerExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.rendered-markdown',
  requires: [IDocumentRegistry, IRenderMime, IStateDB],
  activate: (app: JupyterLab, registry: IDocumentRegistry, rendermime: IRenderMime, state: IStateDB) => {
    const factory = new MarkdownWidgetFactory({
      name: FACTORY,
      fileExtensions: ['.md'],
      rendermime
    });

    const tracker = new InstanceTracker<MarkdownWidget>({
      restore: {
        state,
        command: 'file-operations:open',
        args: widget => ({ path: widget.context.path, factory: FACTORY }),
        name: widget => widget.context.path,
        namespace: 'rendered-markdown',
        when: app.started,
        registry: app.commands
      }
    });

    let icon = `${PORTRAIT_ICON_CLASS} ${TEXTEDITOR_ICON_CLASS}`;

    // Sync tracker with currently focused widget.
    app.shell.currentChanged.connect((sender, args) => {
      tracker.sync(args.newValue);
    });

    factory.widgetCreated.connect((sender, widget) => {
      widget.title.icon = icon;
      // Notify the instance tracker if restore data needs to update.
      widget.context.pathChanged.connect(() => { tracker.save(widget); });
      tracker.add(widget);
    });

    registry.addWidgetFactory(factory);
  },
  autoStart: true
};
