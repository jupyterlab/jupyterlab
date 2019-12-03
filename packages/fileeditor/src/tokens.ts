// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IWidgetTracker } from '@jupyterlab/apputils';

import { IDocumentWidget } from '@jupyterlab/docregistry';

import { Token } from '@lumino/coreutils';

import { FileEditor } from './widget';

/**
 * A class that tracks editor widgets.
 */
export interface IEditorTracker
  extends IWidgetTracker<IDocumentWidget<FileEditor>> {}

/* tslint:disable */
/**
 * The editor tracker token.
 */
export const IEditorTracker = new Token<IEditorTracker>(
  '@jupyterlab/fileeditor:IEditorTracker'
);
/* tslint:enable */
