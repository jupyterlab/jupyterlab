// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel
} from 'jupyter-js-services';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  FocusTracker
} from 'phosphor/lib/ui/focustracker';

import {
  AbstractCodeEditor, CodeEditorProvider
} from '../codeeditor/editor';

import {
  CodeEditorWidget
} from '../codeeditor/widget';

import {
  CodeMirrorEditor, DEFAULT_CODEMIRROR_THEME
} from '../codemirror/editor';

import {
  ABCWidgetFactory, IDocumentModel, IDocumentContext
} from '../docregistry';


/**
 * The class name added to a dirty widget.
 */
const DIRTY_CLASS = 'jp-mod-dirty';

/**
 * The class name added to a jupyter code mirror widget.
 */
const EDITOR_CLASS = 'jp-EditorWidget';


/**
 * A class that tracks editor widgets.
 */
export
interface IEditorTracker extends FocusTracker<CodeMirrorEditorWidget> {}


/* tslint:disable */
/**
 * The editor tracker token.
 */
export
const IEditorTracker = new Token<IEditorTracker>('jupyter.services.editor-tracker');
/* tslint:enable */

/**
 * A document widget for the CodeMirror editor.
 */
export
class CodeMirrorEditorWidget extends EditorWidget<CodeMirrorEditor> {

  constructor(context: IDocumentContext<IDocumentModel>)  {
    super((widget) => {
      return new CodeMirrorEditor(widget, {
        extraKeys: {
          'Tab': 'indentMore',
        },
        indentUnit: 4,
        theme: DEFAULT_CODEMIRROR_THEME,
        lineNumbers: true,
        lineWrapping: true,
      })
    }, context);
  }

  get codeMirrorEditor() {
    return this.editor.codeMirrorEditor;
  }

}

/**
 * A document widget for the code editor.
 */
export
class EditorWidget<E extends AbstractCodeEditor> extends CodeEditorWidget<E> {
  /**
   * Construct a new editor widget.
   */
  constructor(editorProvider:CodeEditorProvider<E>, context: IDocumentContext<IDocumentModel>) {
    super(editorProvider);
    this.addClass(EDITOR_CLASS);
    let editor = this.editor;
    let model = context.model;
    let doc = editor.getModel();
    doc.setValue(model.toString());
    this.title.label = context.path.split('/').pop();
    editor.getModel().uri = context.path;
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
      editor.getModel().uri = path;
      this.title.label = path.split('/').pop();
    });
    model.contentChanged.connect(() => {
      let old = doc.getValue();
      let text = model.toString();
      if (old !== text) {
        doc.setValue(text);
      }
    });
    editor.getModel().contentChanged.connect((editorModel) => {
      model.fromString(editorModel.getValue());
    });
  }
}

/**
 * A widget factory for editors.
 */
export
class EditorWidgetFactory extends ABCWidgetFactory<CodeMirrorEditorWidget, IDocumentModel> {

  /**
   * Create a new widget given a context.
   */
  createNew(context: IDocumentContext<IDocumentModel>, kernel?: IKernel.IModel): CodeMirrorEditorWidget {
    if (kernel) {
      context.changeKernel(kernel);
    }
    let widget = new CodeMirrorEditorWidget(context);
    this.widgetCreated.emit(widget);
    return widget;
  }

}
