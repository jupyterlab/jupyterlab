// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CodeEditor,
  CodeEditorWrapper,
  IEditorServices
} from '@jupyterlab/codeeditor';
import { IDebugger } from './tokens';

/**
 * A widget factory for read only editors.
 */
export class ReadOnlyEditorFactory {
  /**
   * Construct a new editor widget factory.
   *
   * @param options The instantiation options for a ReadOnlyEditorFactory.
   */
  constructor(options: ReadOnlyEditorFactory.IOptions) {
    this._services = options.editorServices;
  }

  /**
   * Create a new CodeEditorWrapper given a Source.
   *
   * @param source The source to create a new editor for.
   */
  createNewEditor(source: IDebugger.Source): CodeEditorWrapper {
    const { content, mimeType, path } = source;
    const factory = this._services.factoryService.newInlineEditor;
    const mimeTypeService = this._services.mimeTypeService;
    const model = new CodeEditor.Model({
      mimeType: mimeType || mimeTypeService.getMimeTypeByFilePath(path)
    });
    model.sharedModel.source = content;
    const editor = new CodeEditorWrapper({
      editorOptions: {
        config: {
          readOnly: true,
          lineNumbers: true
        }
      },
      model,
      factory
    });
    editor.node.setAttribute('data-jp-debugger', 'true');

    editor.disposed.connect(() => {
      model.dispose();
    });

    return editor;
  }

  private _services: IEditorServices;
}

/**
 * The namespace for `ReadOnlyEditorFactory` class statics.
 */
export namespace ReadOnlyEditorFactory {
  /**
   * The options used to create a read only editor widget factory.
   */
  export interface IOptions {
    /**
     * The editor services used by the factory.
     */
    editorServices: IEditorServices;
  }
}
