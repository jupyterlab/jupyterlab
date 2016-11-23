import {
  JupyterLabPlugin
} from '../application';

import {
  IEditorFactory
} from '../codeeditor';

import {
  MonacoCodeEditorFactory
} from './index';


/**
 * The editor factory.
 */
export
const editorFactory: JupyterLabPlugin<IEditorFactory> = {
  id: IEditorFactory.name,
  provides: IEditorFactory,
  activate: (): IEditorFactory => {
    let factory = new MonacoCodeEditorFactory();
    return factory;
  }
};
