/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { Panel } from '@lumino/widgets';
import { Toolbar } from './toolbar';

/**
 * A base class for panel widget with toolbar.
 */
export class PanelWithToolbar extends Panel implements Toolbar.IWidgetToolbar {
  constructor(options: PanelWithToolbar.IOptions = {}) {
    super(options);
    this._toolbar = new Toolbar();
  }

  /**
   * Widget toolbar
   */
  get toolbar(): Toolbar {
    return this._toolbar;
  }

  protected _toolbar: Toolbar;
}

/**
 * Namespace for panel with toolbar
 */
export namespace PanelWithToolbar {
  /**
   * An options object for creating a panel with toolbar widget.
   */
  export interface IOptions extends Panel.IOptions {
    /**
     * Custom toolbar
     */
    toolbar?: Toolbar;
  }
}
