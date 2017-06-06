// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IInstanceTracker
} from '@jupyterlab/apputils';

import {
  Token
} from '@phosphor/coreutils';

import {
  ImageViewer
} from './widget';

import '../style/index.css';

export * from './widget';


/**
 * A class that tracks editor widgets.
 */
export
interface IImageTracker extends IInstanceTracker<ImageViewer> {}


/* tslint:disable */
/**
 * The editor tracker token.
 */
export
const IImageTracker = new Token<IImageTracker>('jupyter.services.image-tracker');
/* tslint:enable */
