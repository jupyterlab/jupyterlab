// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IRankedMenu, RankedMenu } from '@jupyterlab/ui-components';

/**
 * An interface for a Settings menu.
 */
export interface ISettingsMenu extends IRankedMenu {}

/**
 * An extensible Settings menu for the application.
 */
export class SettingsMenu extends RankedMenu implements ISettingsMenu {
  /**
   * Construct the settings menu.
   */
  constructor(options: IRankedMenu.IOptions) {
    super(options);
  }
}
