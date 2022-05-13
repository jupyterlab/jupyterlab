// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module mainmenu
 */

export * from './mainmenu.js';
export * from './edit.js';
export * from './file.js';
export * from './help.js';
export * from './kernel.js';
export * from './run.js';
export * from './settings.js';
export * from './view.js';
export * from './tabs.js';
export * from './tokens.js';

/**
 * @deprecated since version 3.1
 */
export {
  IRankedMenu as IJupyterLabMenu,
  RankedMenu as JupyterLabMenu
} from '@jupyterlab/ui-components';
