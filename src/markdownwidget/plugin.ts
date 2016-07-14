// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application
} from 'phosphide/lib/core/application';

import {
  DocumentRegistry, IWidgetFactoryOptions
} from '../docregistry';

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
 * The editor handler extension.
 */
export
const markdownHandlerExtension = {
  id: 'jupyter.extensions.RenderedMarkdown',
  requires: [DocumentRegistry],
  activate: (app: Application, registry: DocumentRegistry) => {
    let options: IWidgetFactoryOptions = {
      fileExtensions: ['.md'],
      displayName: 'Rendered Markdown',
      modelName: 'text',
      preferKernel: false,
      canStartKernel: false
    };
    let factory = new MarkdownWidgetFactory();
    let icon = `${PORTRAIT_ICON_CLASS} ${TEXTEDITOR_ICON_CLASS}`;
    factory.widgetCreated.connect((sender, widget) => { widget.title.icon = icon; });
    registry.addWidgetFactory(factory, options);
  }
};
