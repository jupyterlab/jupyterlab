// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  NotebookWidget, NotebookModel, makeModels, NBData
} from 'jupyter-js-notebook';

import {
  Container, Token
} from 'phosphor-di';

import {
  INotebookProvider
} from './index';

import {
  IContentsModel
} from 'jupyter-js-services';


import {
  IServicesProvider
} from '../index';

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
  static requires: Token<any>[] = [IServicesProvider];

  /**
   * Create a new notebook factory instance.
   */
  static create(services: IServicesProvider): INotebookProvider {
    return new NotebookProvider(services);
  }

  constructor(services: IServicesProvider) {
      this._services = services;
  }

  /**
   * Create a new Notebook instance.
   */
  createNotebook(path: string): Promise<NotebookWidget> {
    return this._services.contentsManager.get(path, {}).then((data) => {
      let nbdata: NBData = makedata(data);
      let nbModel = makeModels(nbdata);
      return new NotebookWidget(nbModel);
   })
  }
  
  private _services: IServicesProvider;
}

function makedata(a: IContentsModel): NBData {
  return {
    content: a.content,
    name: a.name,
    path: a.path
  }
}