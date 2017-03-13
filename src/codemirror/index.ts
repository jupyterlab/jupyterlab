// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IEditorServices
} from '../codeeditor';

import {
  CodeMirrorEditorFactory
} from './factory';

import {
  CodeMirrorMimeTypeService
} from './mimetype';

export * from './mode';
export * from './editor';
export * from './factory';
export * from './mimetype';


/**
 * The default editor services.
 */
export
const editorServices: IEditorServices = {
  factoryService: new CodeMirrorEditorFactory(),
  mimeTypeService: new CodeMirrorMimeTypeService()
};
