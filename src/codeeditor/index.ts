import {
  Token
} from 'phosphor/lib/core/token';

import {
  CodeEditor
} from './editor';

import {
  Widget
} from 'phosphor/lib/ui/widget';

export * from './widget';
export * from './editor';

/* tslint:disable */
/**
 * The editor factory token.
 */
export
const IEditorFactory = new Token<IEditorFactory>('jupyter.services.editorfactory');
/* tslint:enable */

export
type EditorFactory = (host: Widget) => CodeEditor.IEditor;

/**
 * The editor factory interface.
 */
export
interface IEditorFactory {

  /**
   * Create a new editor for inline code.
   */
  newInline(options: CodeEditor.IOptions): CodeEditor.IEditor;

  /**
   * Create a new editor for a full document.
   */
  newDocument(options: CodeEditor.IOptions): CodeEditor.IEditor;

}
