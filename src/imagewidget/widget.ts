// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel
} from 'jupyter-js-services';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  ABCWidgetFactory, IDocumentModel, IDocumentContext
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
   * Construct a new image widget.
   */
  constructor(context: IDocumentContext<IDocumentModel>) {
    super({ node: Private.createNode() });
    this._context = context;
    this.node.tabIndex = -1;
    this.addClass(IMAGE_CLASS);

    if (context.model.toString()) {
      this.update();
    }
    context.pathChanged.connect(() => this.update());
    context.model.contentChanged.connect(() => this.update());
    context.contentsModelChanged.connect(() => this.update());
  }

  /**
   * The scale factor for the image.
   */
  get scale(): number {
    return this._scale;
  }
  set scale(value: number) {
    if (value === this._scale) {
      return;
    }
    this._scale = value;
    let scaleNode = this.node.querySelector('div') as HTMLElement;
    let transform: string;
    transform = `scale(${value})`;
    scaleNode.style.transform = transform;
    this.update();
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
    this.title.label = this._context.path.split('/').pop();
    let cm = this._context.contentsModel;
    if (cm === null) {
      return;
    }
    let content = this._context.model.toString();
    let src = `data:${cm.mimetype};${cm.format},${content}`;
    this.node.querySelector('img').setAttribute('src', src);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.focus();
  }

  private _context: IDocumentContext<IDocumentModel>;
  private _scale = 1;
}


/**
 * A widget factory for images.
 */
export
class ImageWidgetFactory extends ABCWidgetFactory<ImageWidget, IDocumentModel> {
  /**
   * Create a new widget given a context.
   */
  createNew(context: IDocumentContext<IDocumentModel>, kernel?: Kernel.IModel): ImageWidget {
    let widget = new ImageWidget(context);
    this.widgetCreated.emit(widget);
    return widget;
  }
}

/**
 * A namespace for image widget private data.
 */
namespace Private {
  /**
   * Create the node for the image widget.
   */
  export
  function createNode(): HTMLElement {
    let node = document.createElement('div');
    let innerNode = document.createElement('div');
    let image = document.createElement('img');
    node.appendChild(innerNode);
    innerNode.appendChild(image);
    return node;
  }
}
