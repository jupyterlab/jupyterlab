// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Menu } from '@lumino/widgets';

import { IJupyterLabMenu, JupyterLabMenu } from './labmenu';

/**
 * An interface for a Settings menu.
 */
export interface ISettingsMenu extends IJupyterLabMenu {}

/**
 * An extensible Settings menu for the application.
 */
export class SettingsMenu extends JupyterLabMenu implements ISettingsMenu {
  /**
   * Construct the settings menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
    this.menu.title.label = 'Settings';
  }
}
