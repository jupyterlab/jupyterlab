// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Menu
} from '@phosphor/widgets';

import {
  IJupyterLabMenu, JupyterLabMenu
} from './labmenu';


/**
 * An interface for an Edit menu.
 */
export
interface IEditMenu extends IJupyterLabMenu {
}

/**
 * An extensible Edit menu for the application.
 */
export
class EditMenu extends JupyterLabMenu implements IEditMenu {
  /**
   * Construct the edit menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
    this.title.label = 'Edit';
  }
}
