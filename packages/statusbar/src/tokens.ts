// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { ISignal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';

// tslint:disable-next-line:variable-name
export const IStatusBar = new Token<IStatusBar>(
  '@jupyterlab/statusbar:IStatusBar',
  'A service for the status bar on the application. Use this if you want to add new status bar items.'
);

/**
 * Main status bar object which contains all widgets.
 */
export interface IStatusBar {
  /**
   * Register a new status item.
   *
   * @param id a unique id for the status item.
   * @param statusItem The options for how to add the status item.
   *
   * @returns an {@link IDisposable} that can be disposed to remove the item.
   */
  registerStatusItem(id: string, statusItem: IStatusBar.IItem): IDisposable;
}

/**
 * A namespace for status bar statics.
 */
export namespace IStatusBar {
  export type Alignment = 'right' | 'left' | 'middle';

  /**
   * Options for status bar items.
   */
  export interface IItem {
    /**
     * The item to add to the status bar.
     */
    item: Widget;

    /**
     * Which side to place item.
     * Permanent items are intended for the right and left side,
     * with more transient items in the middle.
     */
    align?: Alignment;

    /**
     *  Ordering of Items -- higher rank items are closer to the middle.
     */
    rank?: number;

    /**
     *  Displaying Items based on zoom priority -- higher zoom priority gets prioritised when zoom levels increase
     */
    priority?: number;

    /**
     * Whether the item is shown or hidden.
     */
    isActive?: () => boolean;

    /**
     * A signal that is fired when the item active state changes.
     */
    activeStateChanged?: ISignal<any, void>;
  }
}
