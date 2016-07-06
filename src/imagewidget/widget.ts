// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel
} from 'jupyter-js-services';

import {
  Message
} from 'phosphor-messaging';

import {
  Widget
} from 'phosphor-widget';

import {
  ABCWidgetFactory, IDocumentModel, IWidgetFactory, IDocumentContext
} from '../docregistry';

/**
 * The class name added to a imagewidget.
 */
const IMAGE_CLASS = 'jp-ImageWidget';


/**
 * A widget for images.
 */
export
class ImageWidget extends Widget {
  /**
   * Create the node for the image widget.
   */
  static createNode(): HTMLElement {
    let node = document.createElement('div');
    let innerNode = document.createElement('div');
    let image = document.createElement('img');
    node.appendChild(innerNode);
    innerNode.appendChild(image);
    return node;
  }

  /**
   * Construct a new image widget.
   */
  constructor(context: IDocumentContext<IDocumentModel>) {
    super();
    this._context = context;
    this.node.tabIndex = -1;
    this.addClass(IMAGE_CLASS);
    // let scaleNode = (<HTMLElement>this.node.querySelector('div'));
    // scaleNode.style.transform = 'scale(1.5)';

    if (context.model.toString()) {
      this.update();
    }
    context.pathChanged.connect(() => {
      this.update();
    });
    context.model.contentChanged.connect(() => {
      this.update();
    });
    context.contentsModelChanged.connect(() => {
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
    this._context = null;
    super.dispose();
  }

  /**
   * Handle `update-request` messages for the widget.
   */
  protected onUpdateRequest(msg: Message): void {
    this.title.text = this._context.path.split('/').pop();
    //let node = this.node.querySelector('image');
    let cm = this._context.contentsModel;
    if (cm === null) {
      return;
    }
    let content = this._context.model.toString();
    //node.src = `data:${cm.mimetype};${cm.format},${content}`;
    this.node.querySelector('img').setAttribute('src', `data:${cm.mimetype};${cm.format},${content}`);
  }

  private _context: IDocumentContext<IDocumentModel>;
}


/**
 * A widget factory for images.
 */
export
class ImageWidgetFactory extends ABCWidgetFactory<ImageWidget, IDocumentModel> {
  /**
   * Create a new widget given a context.
   */
  createNew(context: IDocumentContext<IDocumentModel>, kernel?: IKernel.IModel): ImageWidget {
    let widget = new ImageWidget(context);
    this.widgetCreated.emit(widget);
    return widget;
  }
}
