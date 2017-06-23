// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Token
} from '@phosphor/coreutils';

import {
  IEditorFactoryService
} from './factory';

import {
  IEditorMimeTypeService
} from './mimetype';

export * from './editor';
export * from './jsoneditor';
export * from './widget';
export * from './factory';
export * from './mimetype';


/* tslint:disable */
/**
 * Code editor services token.
 */
export
const IEditorServices = new Token<IEditorServices>('jupyter.services.editorservices');
/* tslint:enable */


/**
 * Code editor services.
 */
export
interface IEditorServices {
  /**
   * The code editor factory.
   */
  readonly factoryService: IEditorFactoryService;

  /**
   * The editor mime type service.
   */
  readonly mimeTypeService: IEditorMimeTypeService;
}
