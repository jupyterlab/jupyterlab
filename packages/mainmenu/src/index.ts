// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module mainmenu
 */

export * from './mainmenu';
export * from './edit';
export * from './file';
export * from './help';
export * from './kernel';
export * from './run';
export * from './settings';
export * from './view';
export * from './tabs';
export * from './tokens';

/**
 * @deprecated since version 3.1
 */
export {
  IRankedMenu as IJupyterLabMenu,
  RankedMenu as JupyterLabMenu
} from '@jupyterlab/ui-components';
