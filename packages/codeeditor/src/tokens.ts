// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';
import { CodeEditor } from './editor';
import { IEditorFactoryService } from './factory';
import { IEditorMimeTypeService } from './mimetype';

/* tslint:disable */
/**
 * Code editor services token.
 */
export const IEditorServices = new Token<IEditorServices>(
  '@jupyterlab/codeeditor:IEditorServices'
);
/* tslint:enable */

/**
 * Code editor services.
 */
export interface IEditorServices {
  /**
   * The code editor factory.
   */
  readonly factoryService: IEditorFactoryService;

  /**
   * The editor mime type service.
   */
  readonly mimeTypeService: IEditorMimeTypeService;
}

/**
 * Code editor cursor position token.
 */
export const IPositionModel = new Token<IPositionModel>(
  '@jupyterlab/codeeditor:IPositionModel'
);

/**
 * Code editor cursor position model.
 */
export interface IPositionModel {
  /**
   * The current editor of the model.
   */
  editor: CodeEditor.IEditor | null;
}
