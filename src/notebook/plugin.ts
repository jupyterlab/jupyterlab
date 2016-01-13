// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  NotebookWidget, makeModels, NBData
} from 'jupyter-js-notebook';

import {
  Container
} from 'phosphor-di';

import {
  IContentsModel, IContentsManager
} from 'jupyter-js-services';

import {
  IServicesProvider, IFileOpener
} from '../index';

import {
  AbstractFileHandler
} from 'jupyter-js-filebrowser';

import {
  Widget
} from 'phosphor-widget';

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
function resolve(container: Container) {
  Promise.all([container.resolve(IServicesProvider),
               container.resolve(IFileOpener)]).then(([services, opener]) => {
    opener.register(new NotebookFileHandler(services.contentsManager))
  });
}


/**
 * An implementation of a file handler.
 */
export
class NotebookFileHandler extends AbstractFileHandler {

  /**
   * Get the list of file extensions supported by the handler.
   */
  get fileExtensions(): string[] {
    return ['.ipynb']
  }
  
  /**
   * Get file contents given a path.
   */
  protected getContents(manager: IContentsManager, path: string): Promise<IContentsModel> {
    return manager.get(path, { type: 'notebook' });
  }

  /**
   * Create the widget from an `IContentsModel`.
   */
  protected createWidget(contents: IContentsModel): Widget {
      let nbdata: NBData = makedata(contents);
      let nbModel = makeModels(nbdata);
      let widget = new NotebookWidget(nbModel);
      widget.title.text = contents.name;
      return widget;
  }
}

function makedata(a: IContentsModel): NBData {
  return {
    content: a.content,
    name: a.name,
    path: a.path
  }
}