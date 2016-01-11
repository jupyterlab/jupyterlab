// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  NotebookWidget
} from 'jupyter-js-notebook';

import {
  Container, Token
} from 'phosphor-di';

import {
  INotebookProvider
} from './index';

import './plugin.css';


/**
 * Register the plugin contributions.
 *
 * @param container - The di container for type registration.
 *
 * #### Notes
 * This is called automatically when the plugin is loaded.
 */
export
function register(container: Container): void {
  container.register(INotebookProvider, NotebookProvider);
}


/**
 * An implementation of an INotebookProvider.
 */
class NotebookProvider implements INotebookProvider {

  /**
   * The dependencies required by the notebook factory.
   */
  static requires: Token<any>[] = [];

  /**
   * Create a new notebook factory instance.
   */
  static create(): INotebookProvider {
    return new NotebookProvider();
  }

  /**
   * Create a new Terminal instance.
   */
  createNotebook(): NotebookWidget {
    // TODO: make this create a sample notebook with sample data
    return new NotebookWidget();
  }
}
