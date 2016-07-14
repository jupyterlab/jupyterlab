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
  IDocumentModel, IDocumentContext, ABCWidgetFactory
} from '../docregistry';

import {
  MarkdownRenderer
} from '../renderers'


/**
 * The class name added to a Jupyter MarkdownWidget
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
    this.addClass(MD_CLASS);
    this.layout = new PanelLayout();
    this.title.text = context.path.split('/').pop();

    let model = context.model;
    let layout = this.layout as PanelLayout;
    let renderer = new MarkdownRenderer();

    context.pathChanged.connect((c, path) => {
      this.title.text = path.split('/').pop();
    });

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
   * Create a new widget given a context.
   */
  createNew(context: IDocumentContext<IDocumentModel>, kernel?: IKernel.IModel): MarkdownWidget {
    let widget = new MarkdownWidget(context);
    this.widgetCreated.emit(widget);
    return widget;
  }
}
