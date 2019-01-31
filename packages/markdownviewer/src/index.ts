// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IInstanceTracker } from '@jupyterlab/apputils';

import { Token } from '@phosphor/coreutils';

import { MarkdownDocument } from './widget';

import '../style/index.css';

export * from './widget';

/**
 * A class that tracks markdown viewer widgets.
 */
export interface IMarkdownViewerTracker
  extends IInstanceTracker<MarkdownDocument> {}

/**
 * The markdownviewer tracker token.
 */
export const IMarkdownViewerTracker = new Token<IMarkdownViewerTracker>(
  '@jupyterlab/markdownviewer:IMarkdownViewerTracker'
);
