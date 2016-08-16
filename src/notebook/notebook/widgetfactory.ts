// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Token
} from 'phosphor/lib/core/token';

import {
  FocusTracker
} from 'phosphor/lib/ui/focustracker';

import {
  ABCWidgetFactory, IDocumentContext
} from '../../docregistry';

import {
  INotebookModel
} from './model';

import {
  NotebookPanel
} from './panel';
/* tslint:enable */

/**
 * A class that tracks notebook widgets.
 */
export
interface INotebookTracker extends FocusTracker<NotebookPanel> {}

/* tslint:disable */
/**
 * The notebook tracker token.
 */
export
const INotebookTracker = new Token<INotebookTracker>('jupyter.services.notebook-handler');

/**
 * A widget factory for notebook panels.
 */
export
interface NotebookWidgetFactory extends ABCWidgetFactory<NotebookPanel, INotebookModel> {
  tracker:INotebookTracker
}

export
const NotebookWidgetFactory = new Token<NotebookWidgetFactory>('jupyter.services.notebook.factory');
