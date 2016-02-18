// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  AbstractFileHandler, DocumentManager
} from 'jupyter-js-docmanager';

import {
  FileBrowserWidget
} from 'jupyter-js-filebrowser';

import {
  IContentsModel
} from 'jupyter-js-services';

import {
  Application
} from 'phosphide/lib/core/application';

import * as arrays
 from 'phosphor-arrays';

import {
  Property
} from 'phosphor-properties';

import {
  Widget
} from 'phosphor-widget';


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
  },
};
