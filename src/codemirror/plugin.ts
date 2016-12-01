import {
  JupyterLabPlugin
} from '../application';

import {
  IEditorServices
} from '../codeeditor';

import {
  CodeMirrorEditorFactory
} from './factory';

import {
  CodeMirrorMimeTypeService
} from './mimetype';


/**
 * The editor services.
 */
export
const editorExtension: JupyterLabPlugin<IEditorServices> = {
  id: IEditorServices.name,
  provides: IEditorServices,
  activate: (): IEditorServices => {
    const factory = new CodeMirrorEditorFactory();
    const mimeTypeService = new CodeMirrorMimeTypeService();
    return { factory, mimeTypeService };
  }
};
