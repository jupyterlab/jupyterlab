// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  DocumentManager
} from 'jupyter-js-docmanager';

import {
  IContentsModel
} from 'jupyter-js-services';

import {
  Token
} from 'phosphor-di';

import {
  ISignal
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';


/**
 * An interface for a document manager.
 */
export
interface IDocumentManager extends DocumentManager {
}


/**
 * The dependency token for the `IDocumentManager` interface.
 */
export
const IDocumentManager = new Token<IDocumentManager>('jupyter-js-plugins.IDocumentManager');
