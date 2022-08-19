// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IRankedMenu, RankedMenu } from '@jupyterlab/ui-components';

/**
 * An interface for a Tabs menu.
 */
export interface ITabsMenu extends IRankedMenu {}

/**
 * An extensible Tabs menu for the application.
 */
export class TabsMenu extends RankedMenu implements ITabsMenu {
  /**
   * Construct the tabs menu.
   */
  constructor(options: IRankedMenu.IOptions) {
    super(options);
  }
}
