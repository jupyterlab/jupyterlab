// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  DocumentManager
} from 'jupyter-js-ui/lib/docmanager';


/**
 * The class name added to document widgets.
 */
export
const DOCUMENT_CLASS = 'jp-Document';

/**
 * The class name added to focused widgets.
 */
export
const FOCUS_CLASS = 'jp-mod-focus';


/**
 * The default document manager provider.
 */
export
const documentManagerProvider = {
  id: 'jupyter.services.documentManager',
  provides: DocumentManager,
  resolve: () => {
    return new DocumentManager();
  }
};
