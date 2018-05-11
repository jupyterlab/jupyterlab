// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IInstanceTracker
} from '@jupyterlab/apputils';

import {
  Token
} from '@phosphor/coreutils';

import {
  MimeDocument
} from './mimedocument';

import '../style/index.css';

export * from './context';
export * from './default';
export * from './mimedocument';
export * from './registry';


/**
 * A class that tracks markdown viewer widgets.
 */
export
interface IMarkdownViewerTracker extends IInstanceTracker<MimeDocument> {}


/* tslint:disable */
/**
 * A token for a markdown viewer widget tracker.
 *
 * #### Notes
 * These tokens are usually defined in the package which
 * implements a given widget, but the rendered
 * markdown widget is implemented as a MimeDocument.
 * That being said, we still want extensions to be able
 * to provide this token, so it is exported here.
 */
export
const IMarkdownViewerTracker = new Token<IMarkdownViewerTracker>('@jupyterlab/imageviewer:IImageTracker');
/* tslint:enable */
