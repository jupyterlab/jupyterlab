// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  NotebookWidget, NotebookModel, serialize, deserialize
} from 'jupyter-js-notebook';

import {
  IContentsModel, IContentsManager, IContentsOpts
} from 'jupyter-js-services';

import {
  AbstractFileHandler, DocumentManager
} from 'jupyter-js-ui/lib/docmanager';

import {
  Application
} from 'phosphide/lib/core/application';

import {
  JupyterServices
} from '../services/plugin';



/**
 * The notebook file handler provider.
 */
export
const notebookHandlerExtension = {
  id: 'jupyter.extensions.notebookHandler',
  requires: [DocumentManager, JupyterServices],
  activate: activateNotebookHandler
};


/**
 * Activate the notebook handler extension.
 */
function activateNotebookHandler(app: Application, manager: DocumentManager, services: JupyterServices): Promise<void> {
  let handler = new NotebookFileHandler(
    services.contentsManager
  );
  manager.register(handler);
  return Promise.resolve(void 0);
}


/**
 * An implementation of a file handler.
 */
class NotebookFileHandler extends AbstractFileHandler<NotebookWidget> {

  constructor(contents: IContentsManager) {
    super(contents);
  }

  /**
   * Get the list of file extensions supported by the handler.
   */
  get fileExtensions(): string[] {
    return ['.ipynb'];
  }

  /**
   * Get options use to fetch the model contents from disk.
   */
  protected getFetchOptions(model: IContentsModel): IContentsOpts {
    return { type: 'notebook' };
  }

  /**
   * Get the options used to save the widget content.
   */
  protected getSaveOptions(widget: NotebookWidget, model: IContentsModel): Promise<IContentsOpts> {
      let content = serialize(widget.model);
      return Promise.resolve({ type: 'notebook', content });
  }

  /**
   * Create the widget from an `IContentsModel`.
   */
  protected createWidget(contents: IContentsModel): NotebookWidget {
    let model = new NotebookModel();
    model.readOnly = true;
    return new NotebookWidget(model);
  }

  /**
   * Populate the notebook widget with the contents of the notebook.
   */
  protected populateWidget(widget: NotebookWidget, model: IContentsModel): Promise<IContentsModel> {
    deserialize(model.content, widget.model);
    if (widget.model.cells.length === 0) {
      let cell = widget.model.createCodeCell();
      widget.model.cells.add(cell);
    }

    return Promise.resolve(model);
  }
}
