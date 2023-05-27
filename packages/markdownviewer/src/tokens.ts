// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IWidgetTracker } from '@jupyterlab/apputils';
import { Token } from '@lumino/coreutils';
import { MarkdownDocument } from './widget';

/**
 * The markdownviewer tracker token.
 */
export const IMarkdownViewerTracker = new Token<IMarkdownViewerTracker>(
  '@jupyterlab/markdownviewer:IMarkdownViewerTracker',
  `A widget tracker for markdown
  document viewers. Use this if you want to iterate over and interact with rendered markdown documents.`
);

/**
 * A class that tracks markdown viewer widgets.
 */
export interface IMarkdownViewerTracker
  extends IWidgetTracker<MarkdownDocument> {}
