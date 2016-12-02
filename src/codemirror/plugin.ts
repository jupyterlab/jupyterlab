import {
  JupyterLabPlugin
} from '../application';

import {
  IEditorServices
} from '../codeeditor';

import {
  CodeMirrorEditorFactory, CodeMirrorMimeTypeService
} from '.';


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
