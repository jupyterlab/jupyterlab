// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IWidgetTracker } from '@jupyterlab/apputils';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { Token } from '@lumino/coreutils';
import { FileEditor, FileEditorFactory } from './widget';

/**
 * A class that tracks editor widgets.
 */
export interface IEditorTracker
  extends IWidgetTracker<IDocumentWidget<FileEditor>> {}

/**
 * The editor tracker token.
 */
export const IEditorTracker = new Token<IEditorTracker>(
  '@jupyterlab/fileeditor:IEditorTracker',
  `A widget tracker for file editors.
  Use this if you want to be able to iterate over and interact with file editors
  created by the application.`
);

/**
 * The editor widget factory token.
 */
export const IEditorWidgetFactory = new Token<FileEditorFactory.IFactory>(
  '@jupyterlab/fileeditor:IEditorWidgetFactory',
  'A factory for creating file editors.'
);
