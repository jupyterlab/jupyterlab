// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as marked
  from 'marked';

import {
  IKernel
} from 'jupyter-js-services';

import {
  Widget
} from 'phosphor-widget';

import {
  Message
} from 'phosphor-messaging';

import {
  MarkdownRenderer
} from '../renderers';

import {
  IDocumentModel, IDocumentContext, ABCWidgetFactory
} from '../docregistry';

import {
  removeMath, replaceMath, typeset
} from '../renderers/latex';

import {
  HTMLWidget
} from '../renderers'

import {
  sanitize
} from 'sanitizer';

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
      let data = removeMath(model.toString());
      let html = marked(data['text']);
      this.node.innerHTML = sanitize(replaceMath(html, data['math']));
      typeset(this.node);
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
