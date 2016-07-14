// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel
} from 'jupyter-js-services';

import {
  PanelLayout
} from 'phosphor-panel';

import {
  Widget
} from 'phosphor-widget';

import {
  Message
} from 'phosphor-messaging';

import {
  IDocumentModel, IDocumentContext, ABCWidgetFactory
} from '../docregistry';

import {
  MarkdownRenderer
} from '../renderers'


/**
 * The class name added to a dirty widget.
 */
const DIRTY_CLASS = 'jp-mod-dirty';

/**
 * The class name added to a jupyter MarkdownWidget
 */
const MD_CLASS = 'jp-MarkdownWidget';


/**
 * A widget for rendered markdown.
 */
export
class MarkdownWidget extends Widget {
  /**
   * Construct a new markdown widget.
   */

  constructor(context: IDocumentContext<IDocumentModel>) {
    super();
    let model = context.model;
    this.addClass(MD_CLASS);
    this.layout = new PanelLayout();
    this.title.text = context.path.split('/').pop();

    // model.stateChanged.connect((m, args) => {
    //   if (args.name === 'dirty') {
    //     if (args.newValue) {
    //       this.title.className += ` ${DIRTY_CLASS}`;
    //     } else {
    //       this.title.className = this.title.className.replace(DIRTY_CLASS, '');
    //     }
    //   }
    // });
    context.pathChanged.connect((c, path) => {
      this.title.text = path.split('/').pop();
    });

    let layout = this.layout as PanelLayout;
    let renderer = new MarkdownRenderer();

    model.contentChanged.connect(() => {
      let widget = renderer.render('text/markdown', model.toString());
      if (layout.childCount()) {
        layout.childAt(0).dispose();
      }
      layout.addChild(widget);
    });

  }
}


/**
 * A widget factory for Markdown.
 */
export
class MarkdownWidgetFactory extends ABCWidgetFactory<MarkdownWidget, IDocumentModel> {
  /**
   * Create a new widget given a context
   * .
   */
  createNew(context: IDocumentContext<IDocumentModel>, kernel?: IKernel.IModel): MarkdownWidget {
    let widget = new MarkdownWidget(context);
    this.widgetCreated.emit(widget);
    return widget;
  }
}
