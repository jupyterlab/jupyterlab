// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IDocumentRegistry, IWidgetFactoryOptions
} from '../docregistry';

import {
  IRenderMime
} from '../rendermime';

import {
  MarkdownWidgetFactory
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
 * The markdown handler extension.
 */
export
const markdownHandlerExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.rendered-markdown',
  requires: [IDocumentRegistry, IRenderMime],
  activate: (app: JupyterLab, registry: IDocumentRegistry, rendermime: IRenderMime) => {
    let options: IWidgetFactoryOptions = {
      fileExtensions: ['.md'],
      displayName: 'Rendered Markdown',
      modelName: 'text',
      preferKernel: false,
      canStartKernel: false
    };
    let factory = new MarkdownWidgetFactory(rendermime);
    let icon = `${PORTRAIT_ICON_CLASS} ${TEXTEDITOR_ICON_CLASS}`;
    factory.widgetCreated.connect((sender, widget) => {
      widget.title.icon = icon;
    });
    registry.addWidgetFactory(factory, options);
  },
  autoStart: true
};
