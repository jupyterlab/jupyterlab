// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

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
  CodeEditor, IEditorServices, IEditorMimeTypeService
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
  constructor(
    editorFactory: (host: Widget) => CodeEditor.IEditor,
    context: DocumentRegistry.Context,
    editorMimeTypeService: IEditorMimeTypeService) {
    super(editorFactory);
    this.addClass(EDITOR_CLASS);
    this._context = context;
    let model = context.model;
    let editor = this.editor;
    let value = editor.model.value;

    // Prevent the initial loading from disk from being in the editor history.
    context.ready.then( () => {
      value.text = model.toString();
      editor.model.clearHistory();
    });

    value.text = model.toString();

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
      let old = value.text;
      let text = model.toString();
      if (old !== text) {
        value.text = text;
      }
    });
    this.editor.model.value.changed.connect((sender, args) => {
      model.fromString(value.text);
    });
    editor.model.mimeType = editorMimeTypeService.getMimeTypeByFilePath(context.path);
    context.pathChanged.connect((c, path) => {
      editor.model.mimeType = editorMimeTypeService.getMimeTypeByFilePath(path);
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

  constructor(editorServices: IEditorServices, options: DocumentRegistry.IWidgetFactoryOptions) {
    super(options);
    this._editorServices = editorServices;
  }

  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(context: DocumentRegistry.Context): EditorWidget {
    const { factory, mimeTypeService } = this._editorServices;
    return new EditorWidget((host: Widget) => {
      let editor = factory.newDocumentEditor(host.node, {
          lineNumbers: true,
          readOnly: false,
          wordWrap: true,
      });
      return editor;
    }, context, mimeTypeService);
  }

  private _editorServices: IEditorServices;
}
