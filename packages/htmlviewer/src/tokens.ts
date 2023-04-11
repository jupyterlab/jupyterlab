/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { IWidgetTracker } from '@jupyterlab/apputils';
import { Token } from '@lumino/coreutils';
import { HTMLViewer } from './widget';

/**
 * A class that tracks HTML viewer widgets.
 */
export interface IHTMLViewerTracker extends IWidgetTracker<HTMLViewer> {}

/**
 * The HTML viewer tracker token.
 */
export const IHTMLViewerTracker = new Token<IHTMLViewerTracker>(
  '@jupyterlab/htmlviewer:IHTMLViewerTracker',
  `A widget tracker for rendered HTML documents.
  Use this if you want to be able to iterate over and interact with HTML documents
  viewed by the application.`
);
