// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CodeEditor
} from './editor';


/**
 * The editor factory service interface.
 */
export
interface IEditorFactoryService {
  /**
   * Create a new editor for inline code.
   */
  newInlineEditor(options: CodeEditor.IOptions): CodeEditor.IEditor;

  /**
   * Create a new editor for a full document.
   */
  newDocumentEditor(options: CodeEditor.IOptions): CodeEditor.IEditor;
}
