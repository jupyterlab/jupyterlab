// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IInstanceTracker, InstanceTracker } from '@jupyterlab/apputils';

import { Token } from '@phosphor/coreutils';

import { NotebookPanel } from './panel';

/**
 * An object that tracks notebook widgets.
 */
export interface INotebookTracker extends IInstanceTracker<NotebookPanel> {}

/* tslint:disable */
/**
 * The notebook tracker token.
 */
export const INotebookTracker = new Token<INotebookTracker>(
  '@jupyterlab/notebook:INotebookTracker'
);
/* tslint:enable */

export class NotebookTracker extends InstanceTracker<NotebookPanel>
  implements INotebookTracker {}
