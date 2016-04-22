// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IContentsModel, IContentsOpts
} from 'jupyter-js-services';

import {
  AbstractFileHandler, FileHandlerRegistry
} from 'jupyter-js-ui/lib/filehandler';

import {
  Application
} from 'phosphide/lib/core/application';

import {
  Widget
} from 'phosphor-widget';

import {
  JupyterServices
} from '../services/plugin';


/**
 * The image file handler extension.
 */
export
const imageHandlerExtension = {
  id: 'jupyter.extensions.imageHandler',
  requires: [FileHandlerRegistry, JupyterServices],
  activate: (app: Application, registry: FileHandlerRegistry, services: JupyterServices) => {
    let handler = new ImageHandler(services.contentsManager);
    registry.addHandler(handler);
    return Promise.resolve(void 0);
  }
};


export
class ImageHandler extends AbstractFileHandler<Widget> {
  /**
   * Get the list of file extensions explicitly supported by the handler.
   */
  get fileExtensions(): string[] {
    return ['.png', '.gif', '.jpeg', '.jpg', '.svg', '.bmp', '.ico', '.xbm',
            '.tiff', '.tif'];
  }

  /**
   * Get the options used to save the widget content.
   */
  protected getFetchOptions(path: string): IContentsOpts {
    return { type: 'file' };
  }

  /**
   * Get the options used to save the widget content.
   */
  protected getSaveOptions(widget: Widget, path: string): Promise<IContentsOpts> {
    return Promise.resolve(void 0);
  }

  /**
   * Create the widget from a path.
   */
  protected createWidget(path: string): Widget {
    var widget = new Widget();
    widget.node.tabIndex = 0;
    let image = document.createElement('img');
    widget.node.appendChild(image);
    widget.node.style.overflowX = 'auto';
    widget.node.style.overflowY = 'auto';
    widget.title.text = path.split('/').pop();
    return widget;
  }

 /**
  * Populate a widget from `IContentsModel`.
  */
  protected populateWidget(widget: Widget, model: IContentsModel): Promise<IContentsModel> {
    return new Promise<IContentsModel>((resolve, reject) => {
      let img = widget.node.firstChild as HTMLImageElement;
      img.addEventListener('load', () => {
        resolve(void 0);
      });
      img.addEventListener('error', error => {
        reject(error);
      });
      img.src = `data:${model.mimetype};${model.format},${model.content}`;
      return model;
    });
  }
}
