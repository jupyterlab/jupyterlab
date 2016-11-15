import {
  JupyterLabPlugin
} from '../application';

import {
  IEditorFactory
} from '../codeeditor';

import {
  CodeMirrorEditorFactory
} from './editor';


/**
 * The editor factory.
 */
export
const editorFactory: JupyterLabPlugin<IEditorFactory> = {
  id: IEditorFactory.name,
  provides: IEditorFactory,
  activate: (): IEditorFactory => {
    let factory = new CodeMirrorEditorFactory();
    return factory;
  }
};
