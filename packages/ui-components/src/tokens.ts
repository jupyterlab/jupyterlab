// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';

/**
 * Placeholder for future icon manager class to assist with
 * overriding/replacing particular sets of icons
 */
export interface IJLIconManager {}

/**
 * The IJLIconManager token.
 */
export const IJLIconManager = new Token<IJLIconManager>(
  '@jupyterlab/ui-components:IJLIconManager'
);
