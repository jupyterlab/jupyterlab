// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel
} from 'jupyter-js-services';

import {
  Widget
} from 'phosphor-widget';

import {
  MarkdownRenderer
} from '../renderers';

import {
  IDocumentModel, IDocumentContext, ABCWidgetFactory
} from '../docregistry';


/**
 * The class name added to a dirty widget.
 */
const DIRTY_CLASS = 'jp-mod-dirty';

/**
 * The class name added to a jupyter MarkdownWidget
 */
const MD_CLASS = 'jp-MarkdownWidget';


/**
 * A document widget for codemirrors.
 */
export
class MarkdownWidget extends Widget {
  /**
   * Construct a new editor widget.
   */

  constructor(context: IDocumentContext<IDocumentModel>) {
    super();
    this.addClass(MD_CLASS);
    let model = context.model;
    this.title.text = context.path.split('/').pop();
    
    model.stateChanged.connect((m, args) => {
      if (args.name === 'dirty') {
        if (args.newValue) {
          this.title.className += ` ${DIRTY_CLASS}`;
        } else {
          this.title.className = this.title.className.replace(DIRTY_CLASS, '');
        }
      }
    });
    context.pathChanged.connect((c, path) => {
      this.title.text = path.split('/').pop();
    });
    
    model.contentChanged.connect(() => {
      let rendered_md = new MarkdownRenderer().render('text/markdown', model.toString());
      this.node.innerHTML = rendered_md.node.innerHTML;
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
    if (kernel) {
      context.changeKernel(kernel);
    }
    let widget = new MarkdownWidget(context);
    this.widgetCreated.emit(widget);
    return widget;
  }
}
