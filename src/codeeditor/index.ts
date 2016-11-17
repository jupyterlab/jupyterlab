import {
  Token
} from 'phosphor/lib/core/token';

import {
  CodeEditor
} from './editor';

export * from './widget';
export * from './editor';

/* tslint:disable */
/**
 * The editor factory token.
 */
export
const IEditorFactory = new Token<IEditorFactory>('jupyter.services.editorfactory');
/* tslint:enable */

/**
 * The editor factory interface.
 */
export
interface IEditorFactory {

  /**
   * Create a new editor for inline code.
   */
  newInlineEditor(host: HTMLElement, options: CodeEditor.IOptions): CodeEditor.IEditor;

  /**
   * Create a new editor for a full document.
   */
  newDocumentEditor(host: HTMLElement, options: CodeEditor.IOptions): CodeEditor.IEditor;

}
