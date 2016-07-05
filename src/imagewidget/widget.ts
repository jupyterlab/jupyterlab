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
    return document.createElement('img');
  }

  /**
   * Construct a new image widget.
   */
  constructor(context: IDocumentContext<IDocumentModel>) {
    super();
    this._context = context;
    this.node.tabIndex = -1;
    this.addClass(IMAGE_CLASS);
    this.node.style.overflowX = 'auto';
    this.node.style.overflowY = 'auto';
    // this.node.style.padding = '15px 15px 15px 15px';
    // this.node.style.border = 'none';
    // this.node.style.height = '100px';
    // this.node.style.width = '100px';
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
    let node = this.node as HTMLImageElement;
    let cm = this._context.contentsModel;
    if (cm === null) {
      return;
    }
    let content = this._context.model.toString();
    node.src = `data:${cm.mimetype};${cm.format},${content}`;
    //let innerurl: string;
    //innerurl = `url(data:${cm.mimetype};${cm.format},${content})`;
    //node.style.backgroundImage = "url(" + "data:" + cm.mimetype + ";" + cm.format + "," + content + ")";
    //node.style.background = innerurl;
    //console.log(innerurl);
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
