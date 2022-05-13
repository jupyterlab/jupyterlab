// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module codemirror
 */

import { IEditorServices } from '@jupyterlab/codeeditor';
import { CodeMirrorEditorFactory } from './factory.js';
import { CodeMirrorMimeTypeService } from './mimetype.js';

export * from './editor.js';
export * from './factory.js';
export * from './mimetype.js';
export * from './mode.js';
export * from './searchprovider.js';
export * from './syntaxstatus.js';
export * from './tokens.js';

/**
 * The default editor services.
 */
export const editorServices: IEditorServices = {
  factoryService: new CodeMirrorEditorFactory(),
  mimeTypeService: new CodeMirrorMimeTypeService()
};

/**
 * FIXME-TRANS: Maybe an option to be able to pass a translator to the factories?
 *

export function getEditorServices(translator: ITranslator): IEditorServices {
  return {
    factoryService: new CodeMirrorEditorFactory({}, translator),
    mimeTypeService: new CodeMirrorMimeTypeService(translator)
  };
}
 */
