// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IWidgetTracker } from '@jupyterlab/apputils';

import { IDocumentWidget } from '@jupyterlab/docregistry';

import { Token } from '@lumino/coreutils';

import { ImageViewer } from './widget';

/**
 * A class that tracks image widgets.
 */
export interface IImageTracker
  extends IWidgetTracker<IDocumentWidget<ImageViewer>> {}

/**
 * The image tracker token.
 */
export const IImageTracker = new Token<IImageTracker>(
  '@jupyterlab/imageviewer:IImageTracker',
  `A widget tracker for images.
  Use this if you want to be able to iterate over and interact with images
  viewed by the application.`
);
