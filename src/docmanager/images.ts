// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernelId
} from 'jupyter-js-services';

import {
  Message
} from 'phosphor-messaging';

import {
  Widget
} from 'phosphor-widget';

import {
  IDocumentModel, IWidgetFactory, IDocumentContext
} from './index';

import {
  ABCWidgetFactory
} from './default';


/**
 * A widget for images.
 */
export
class ImageWidget extends Widget {
  /**
   * Create the node for the image widget.
   */
  static createNode(): HTMLElement {
    return document.createElement('img');
  }

  /**
   * Construct a new image widget.
   */
  constructor(model: IDocumentModel, context: IDocumentContext) {
    super();
    this._model = model;
    this._context = context;
    this.node.tabIndex = -1;
    this.node.style.overflowX = 'auto';
    this.node.style.overflowY = 'auto';
    if (model.toString()) {
      this.update();
    }
    context.pathChanged.connect(() => {
      this.update();
    });
    model.contentChanged.connect(() => {
      this.update();
    });
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._model = null;
    this._context = null;
    super.dispose();
  }

  /**
   * Handle `update-request` messages for the widget.
   */
  protected onUpdateRequest(msg: Message): void {
    this.title.text = this._context.path.split('/').pop();
    let node = this.node as HTMLImageElement;
    let content = this._model.toString();
    let model = this._context.contentsModel;
    node.src = `data:${model.mimetype};${model.format},${content}`;
  }

  private _model: IDocumentModel;
  private _context: IDocumentContext;
}


/**
 * A widget factory for images.
 */
export
class ImageWidgetFactory extends ABCWidgetFactory implements IWidgetFactory<ImageWidget> {
  /**
   * Create a new widget given a document model and a context.
   */
  createNew(model: IDocumentModel, context: IDocumentContext, kernel?: IKernelId): ImageWidget {
    return new ImageWidget(model, context);
  }
}
