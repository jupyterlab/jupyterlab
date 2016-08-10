// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Token
} from 'phosphor/lib/core/token';

import {
  WidgetTracker
} from '../widgettracker';

import {
  NotebookPanel
} from './';


/* tslint:disable */
/**
 * The notebook tracker token.
 */
export
const INotebookTracker = new Token<INotebookTracker>('jupyter.services.notebook-handler');
/* tslint:enable */


/**
 * A class that tracks notebook widgets.
 */
export
interface INotebookTracker extends WidgetTracker<NotebookPanel> {}
