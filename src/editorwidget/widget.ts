// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'codemirror/mode/meta';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  IInstanceTracker
} from '../common/instancetracker';

import {
  ABCWidgetFactory, DocumentRegistry
} from '../docregistry';

import {
  CodeEditor
} from '../codeeditor/editor';

import {
  IEditorFactory
} from '../codeeditor';

import {
  CodeEditorWidget
} from '../codeeditor/widget';

import {
  Widget
} from 'phosphor/lib/ui/widget';

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
interface IEditorTracker extends IInstanceTracker<EditorWidget> {}


/* tslint:disable */
/**
 * The editor tracker token.
 */
export
const IEditorTracker = new Token<EditorWidget>('jupyter.services.editor-tracker');
/* tslint:enable */


/**
 * A document widget for editors.
 */
export
class EditorWidget extends CodeEditorWidget {
  /**
   * Construct a new editor widget.
   */
  constructor(editor: CodeEditor.IEditor, context: DocumentRegistry) {
    super(editor);
    this.addClass(EDITOR_CLASS);
    this._context = context;
    let model = context.model;

    let doc = editor.getDoc();

    // Prevent the initial loading from disk from being in the editor history.
    context.ready.then( () => {
      doc.setValue(model.toString());
      doc.clearHistory();
    });

    editor.model.value = model.toString();

    this.title.label = context.path.split('/').pop();
    model.stateChanged.connect((m, args) => {
      if (args.name === 'dirty') {
        if (args.newValue) {
          this.title.className += ` ${DIRTY_CLASS}`;
        } else {
          this.title.className = this.title.className.replace(DIRTY_CLASS, '');
        }
      }
    });
    model.contentChanged.connect(() => {
      let old = editor.model.value;
      let text = model.toString();
      if (old !== text) {
        editor.model.value = text;
      }
    });
    this.editor.model.valueChanged.connect((sender, args) => {
      model.fromString(args.newValue);
    });
    editor.model.setMimeTypeFromPath(context.path);
    context.pathChanged.connect((c, path) => {
      editor.model.setMimeTypeFromPath(path);
      this.title.label = path.split('/').pop();
    });

    // TODO disconnect on deactivation
  }

  /**
   * Get the context for the editor widget.
   */
  get context(): DocumentRegistry.Context {
    return this._context;
  }

  protected _context: DocumentRegistry.Context;
}

/**
 * A widget factory for editors.
 */
export
class EditorWidgetFactory extends ABCWidgetFactory<EditorWidget, DocumentRegistry.IModel> {

  constructor(editorFactory: IEditorFactory, options: DocumentRegistry.IWidgetFactoryOptions) {
    super(options);
    this._editorFactory = editorFactory;
  }

  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(context: DocumentRegistry.Context): EditorWidget {
    let editor = this._editorFactory.newDocument({
        lineNumbers: true,
        readOnly: false,
        wordWrap: true,
    });
    return new EditorWidget(editor, context);
  }

  private _editorFactory: IEditorFactory = null;
}
