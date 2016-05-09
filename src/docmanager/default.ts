// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IKernelSpecId, IContentsOpts, IKernelId
} from 'jupyter-js-services';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  loadModeByFileName
} from '../codemirror';

import {
  CodeMirrorWidget
} from '../codemirror/widget';

import {
  IDocumentModel, IWidgetFactory, IModelFactory, IDocumentContext,
  IKernelPreference
} from './index';


/**
 * The class name added to a dirty widget.
 */
const DIRTY_CLASS = 'jp-mod-dirty';


/**
 * The default implementation of a document model.
 */
export
class DocumentModel implements IDocumentModel {
  /**
   * Construct a new document model.
   */
  constructor(languagePreference: string) {
    this._defaultLang = languagePreference;
  }

  /**
   * A signal emitted when the document content changes.
   */
  get contentChanged(): ISignal<IDocumentModel, string> {
    return Private.contentChangedSignal.bind(this);
  }

  /**
   * The default kernel name of the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  get defaultKernelName(): string {
    return '';
  }

  /**
   * The default kernel language of the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  get defaultKernelLanguage(): string {
    return this._defaultLang;
  }

  /**
   * Serialize the model.
   */
  serialize(): string {
    return this._text;
  }

  /**
   * Deserialize the model from a string.
   */
  deserialize(value: string): void {
    if (this._text === value) {
      return;
    }
    this._text = value;
    this.contentChanged.emit(value);
  }

  private _text = '';
  private _defaultLang = '';
}


/**
 * The default implementation of a model factory.
 */
export
class ModelFactory {
  /**
   * Create a new model for a given path.
   *
   * @param languagePreference - An optional kernel language preference.
   *
   * @returns A new document model.
   */
  createNew(languagePreference?: string): IDocumentModel {
    return new DocumentModel(languagePreference);
  }

  /**
   * Get the preferred kernel language given a path.
   */
  preferredLanguage(path: string): string {
    // TODO: use a mapping of extension to language.
    return '';
  }
}


/**
 * A document widget for codemirrors.
 */
export
class EditorWidget extends CodeMirrorWidget {

  /**
   * Construct a new editor widget.
   */
  constructor(model: IDocumentModel, context: IDocumentContext) {
    super();
    this._model = model;
    this._context = context;
    let editor = this.editor;
    let doc = editor.getDoc();
    doc.setValue(model.serialize());
    this._updateTitle();
    loadModeByFileName(editor, context.path);
    this._context.dirtyCleared.connect(() => {
      this.dirty = false;
    });
    this._context.pathChanged.connect((c, path) => {
      loadModeByFileName(editor, path);
      this._updateTitle();
    });
    model.contentChanged.connect((m, text) => {
      doc.setValue(text);
    });
    CodeMirror.on(doc, 'change', (instance, change) => {
      if (change.origin !== 'setValue') {
        model.deserialize(instance.getValue());
        this.dirty = true;
      }
    });
  }

  /**
   * The dirty state of the widget.
   */
  get dirty(): boolean {
    return this._dirty;
  }
  set dirty(value: boolean) {
    this._dirty = value;
    if (value) {
      this.title.className += ` ${DIRTY_CLASS}`;
    } else {
      this.title.className = this.title.className.replace(DIRTY_CLASS, '');
    }
  }

  /**
   * Update the title based on the path.
   */
  private _updateTitle(): void {
    this.title.text = this._context.path.split('/').pop();
  }

  private _model: IDocumentModel = null;
  private _context: IDocumentContext = null;
  private _dirty = false;
}


/**
 * The default implemetation of a widget factory.
 */
export
class WidgetFactory implements IWidgetFactory<EditorWidget> {
  /**
   * Create a new widget given a document model and a context.
   */
  createNew(model: IDocumentModel, context: IDocumentContext, kernel: IKernelId): EditorWidget {
    // TODO: if a kernel id or a name other than 'none' or 'default'
    // was given, start that kernel
    return new EditorWidget(model, context);
  }
}


/**
 * A private namespace for data.
 */
namespace Private {
  /**
   * A signal emitted when a document content changes.
   */
  export
  const contentChangedSignal = new Signal<IDocumentModel, string>();

}
