// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import 'codemirror/mode/meta';

import {
  IKernel
} from 'jupyter-js-services';

import {
  loadModeByFileName
} from '../codemirror';

import {
  CodeMirrorWidget
} from '../codemirror/widget';

import {
  ABCWidgetFactory, IDocumentModel, IDocumentContext
} from '../docregistry';

import {
  tracker
} from './plugin';

/**
 * The class name added to a dirty widget.
 */
const DIRTY_CLASS = 'jp-mod-dirty';

/**
 * The class name added to a jupyter code mirror widget.
 */
const EDITOR_CLASS = 'jp-EditorWidget';


/**
 * A document widget for codemirrors.
 */
export
class EditorWidget extends CodeMirrorWidget {
  /**
   * Construct a new editor widget.
   */
  constructor(context: IDocumentContext<IDocumentModel>) {
    super();
    tracker.addWidget(this);
    this.addClass(EDITOR_CLASS);
    let editor = this.editor;
    let model = context.model;
    editor.setOption('lineNumbers', true);
    let doc = editor.getDoc();
    doc.setValue(model.toString());
    this.title.text = context.path.split('/').pop();
    loadModeByFileName(editor, context.path);
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
      loadModeByFileName(editor, path);
      this.title.text = path.split('/').pop();
    });
    model.contentChanged.connect(() => {
      let old = doc.getValue();
      let text = model.toString();
      if (old !== text) {
        doc.setValue(text);
      }
    });
    CodeMirror.on(doc, 'change', (instance, change) => {
      if (change.origin !== 'setValue') {
        model.fromString(instance.getValue());
      }
    });
  }
}


/**
 * A widget factory for editors.
 */
export
class EditorWidgetFactory extends ABCWidgetFactory<EditorWidget, IDocumentModel> {
  /**
   * Create a new widget given a context.
   */
  createNew(context: IDocumentContext<IDocumentModel>, kernel?: IKernel.IModel): EditorWidget {
    if (kernel) {
      context.changeKernel(kernel);
    }
    let widget = new EditorWidget(context);
    this.widgetCreated.emit(widget);
    return widget;
  }
}
