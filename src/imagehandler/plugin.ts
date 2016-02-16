// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  AbstractFileHandler
} from 'jupyter-js-docmanager';

import {
  IContentsModel
} from 'jupyter-js-services';

import {
  Container, Token
} from 'phosphor-di';

import {
  Widget
} from 'phosphor-widget';

import {
  IServicesProvider, IDocumentManager
} from '../index';


/**
 * Register the plugin contributions.
 *
 * @param container - The di container for type registration.
 *
 * #### Notes
 * This is called automatically when the plugin is loaded.
 */
export
function resolve(container: Container): Promise<AbstractFileHandler> {
  return container.resolve({
    requires: [IServicesProvider, IDocumentManager],
    create: (services: IServicesProvider, manager: IDocumentManager) => {
      let handler = new ImageHandler(services.contentsManager);
      manager.register(handler);
      return handler;
    }
  });
}



class ImageHandler extends AbstractFileHandler {
  /**
   * Get the list of file extensions explicitly supported by the handler.
   */
  get fileExtensions(): string[] {
    return ['.png', '.gif', '.jpeg', '.jpg', '.svg', '.bmp', '.ico', '.xbm',
            '.tiff', '.tif']
  }

  /**
   * Get file contents given a path.
   */
  protected getContents(model: IContentsModel): Promise<IContentsModel> {
    return this.manager.get(model.path, { type: 'file' });
  }

  /**
   * Create the widget from an `IContentsModel`.
   */
  protected createWidget(model: IContentsModel): Widget {
    let ext = model.path.split('.').pop();
    var widget = new Widget();
    widget.node.tabIndex = 0;
    let image = document.createElement('img');
    widget.node.appendChild(image);
    widget.node.style.overflowX = 'auto';
    widget.node.style.overflowY = 'auto';
    widget.title.text = model.name;
    return widget;
  }

 /**
  * Populate a widget from `IContentsModel`.
  */
  protected setState(widget: Widget, model: IContentsModel): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let img = widget.node.firstChild as HTMLImageElement;
      img.addEventListener('load', () => {
        resolve(void 0);
      });
      img.addEventListener('error', error => {
        reject(error);
      });
      img.src = `data:${model.mimetype};${model.format},${model.content}`;;
    });
  }

  /**
   * Get the state of the Widget, returns `undefined`.
   */
  protected getState(widget: Widget, model: IContentsModel): Promise<IContentsModel> {
    return Promise.resolve(void 0);
  }
}
