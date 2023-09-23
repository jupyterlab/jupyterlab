/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module mermaid-extension
 */

import {
  MERMAID_FILE_EXTENSIONS,
  MERMAID_MIME_TYPE,
  rendererFactory
} from '@jupyterlab/mermaid';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

const extension: IRenderMime.IExtension = {
  id: '@jupyterlab/mermaid-extension:factory',
  description: 'Provides a renderer for mermaid text-based diagrams.',
  rendererFactory,
  // one more than markdown
  rank: 61,
  dataType: 'string',
  documentWidgetFactoryOptions: [
    {
      name: 'Mermaid',
      primaryFileType: 'mermaid',
      fileTypes: ['mermaid'],
      defaultFor: ['mermaid']
    }
  ],
  fileTypes: [
    {
      mimeTypes: [MERMAID_MIME_TYPE],
      name: 'mermaid',
      extensions: MERMAID_FILE_EXTENSIONS,
      icon: 'ui-components:mermaid'
    }
  ]
};

export default extension;
