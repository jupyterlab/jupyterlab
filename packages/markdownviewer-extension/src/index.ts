// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IRenderMime, markdownRendererFactory
} from '@jupyterlab/rendermime';

import '../style/index.css';

/**
 * The name of the factory that creates markdown widgets.
 */
const FACTORY = 'Markdown Preview';


/**
 * The markdown mime renderer extension.
 */
const extension: IRenderMime.IExtension = {
  id: '@jupyterlab/markdownviewer-extension:factory',
  rendererFactory: markdownRendererFactory,
  dataType: 'string',
  documentWidgetFactoryOptions: {
    name: FACTORY,
    primaryFileType: 'markdown',
    fileTypes: ['markdown'],
  },
};

/**
 * Export the extension as default.
 */
export default extension;
