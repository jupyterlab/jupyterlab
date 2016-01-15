// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  AbstractFileHandler, FileBrowserWidget, FileHandler
} from 'jupyter-js-filebrowser';

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
  IServicesProvider, IFileOpener, IFileHandler
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
function resolve(container: Container) {
  return Promise.all([container.resolve(IServicesProvider),
               container.resolve(IFileOpener)]).then(([services, opener]) => {
    opener.registerDefault(new ImageHandler(services.contentsManager))
  }).then(() => {});
}



class ImageHandler extends AbstractFileHandler {
  /**
   * Get the list of file extensions explicitly supported by the handler.
   */
  get fileExtensions(): string[] {
    return ['.png', '.gif', '.jpeg', '.jpg']
  }

  /**
   * Get file contents given a path.
   */
  protected getContents(path: string): Promise<IContentsModel> {
    return this.manager.get(path, { type: 'file' });
  }

  /**
   * Create the widget from an `IContentsModel`.
   */
  protected createWidget(path: string): Widget {
    let ext = path.split('.').pop();
    var widget = new Widget();
    let canvas = document.createElement('canvas');
    widget.node.appendChild(canvas);
    widget.node.style.overflowX = 'auto';
    widget.node.style.overflowY = 'auto';
    widget.title.text = path.split('/').pop();
    return widget;
  }

 /**
   * Populate a widget from `IContentsModel`.
   */
  protected populateWidget(widget: Widget, model: IContentsModel): Promise<void> {
    let ext = model.path.split('.').pop();
    let uri = `data:image/${ext};base64,${model.content}`;
    var img = new Image();
    var canvas = widget.node.firstChild as HTMLCanvasElement;
    img.addEventListener('load', () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      let context = canvas.getContext('2d')
      context.drawImage(img, 0, 0);
    });
    img.src = uri;
    return Promise.resolve(void 0);
  }
}
