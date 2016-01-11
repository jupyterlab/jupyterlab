// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  NotebookWidget
} from 'jupyter-js-notebook';

import {
  Token
} from 'phosphor-di';



/**
 * A factory for creating a Jupyter editor.
 */
export
interface INotebookProvider {

  /**
   * Create a new Notebook instance.
   */
  createNotebook(): NotebookWidget;
}


/**
 * The dependency token for the `INotebookProvider` interface.
 */
export
const INotebookProvider = new Token<INotebookProvider>('jupyter-js-plugins.INotebookProvider');
