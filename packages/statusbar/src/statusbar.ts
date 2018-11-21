// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ArrayExt } from '@phosphor/algorithm';

import { ISignal } from '@phosphor/signaling';

import { Token } from '@phosphor/coreutils';

import {
  DisposableDelegate,
  DisposableSet,
  IDisposable
} from '@phosphor/disposable';

import { Message } from '@phosphor/messaging';

import { Widget, Panel, PanelLayout } from '@phosphor/widgets';

import {
  statusBar as barStyle,
  side as sideStyle,
  item as itemStyle,
  leftSide as leftSideStyle,
  rightSide as rightSideStyle
} from './style/statusbar';

// tslint:disable-next-line:variable-name
export const IStatusBar = new Token<IStatusBar>(
  '@jupyterlab/statusbar:IStatusBar'
);

/**
 * Main status bar object which contains all widgets.
 */
export interface IStatusBar {
  /**
   * Register a new status item.
   *
   * @param id - a unique id for the status item.
   *
   * @param options - The options for how to add the status item.
   *
   * @returns an `IDisposable` that can be disposed to remove the item.
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
     * Whether the item is shown or hidden.
     */
    isActive?: () => boolean;

    /**
     * A signal that is fired when the item active state changes.
     */
    activeStateChanged?: ISignal<any, void>;
  }
}

/**
 * Main status bar object which contains all items.
 */
export class StatusBar extends Widget implements IStatusBar {
  constructor() {
    super();
    this.addClass(barStyle);

    let rootLayout = (this.layout = new PanelLayout());

    let leftPanel = (this._leftSide = new Panel());
    let middlePanel = (this._middlePanel = new Panel());
    let rightPanel = (this._rightSide = new Panel());

    leftPanel.addClass(sideStyle);
    leftPanel.addClass(leftSideStyle);

    middlePanel.addClass(sideStyle);

    rightPanel.addClass(sideStyle);
    rightPanel.addClass(rightSideStyle);

    rootLayout.addWidget(leftPanel);
    rootLayout.addWidget(middlePanel);
    rootLayout.addWidget(rightPanel);
  }

  /**
   * Register a new status item.
   *
   * @param id - a unique id for the status item.
   *
   * @param statusItem - The item to add to the status bar.
   */
  registerStatusItem(id: string, statusItem: IStatusBar.IItem): IDisposable {
    if (id in this._statusItems) {
      throw new Error(`Status item ${id} already registered.`);
    }

    // Populate defaults for the optional properties of the status item.
    statusItem = { ...Private.statusItemDefaults, ...statusItem };
    const { align, item, rank } = statusItem;

    // Connect the activeStateChanged signal to refreshing the status item,
    // if the signal was provided.
    const onActiveStateChanged = () => {
      this._refreshItem(id);
    };
    if (statusItem.activeStateChanged) {
      statusItem.activeStateChanged.connect(onActiveStateChanged);
    }

    let rankItem = { id, rank };

    statusItem.item.addClass(itemStyle);
    this._statusItems[id] = statusItem;

    if (align === 'left') {
      let insertIndex = this._findInsertIndex(this._leftRankItems, rankItem);
      if (insertIndex === -1) {
        this._leftSide.addWidget(item);
        this._leftRankItems.push(rankItem);
      } else {
        ArrayExt.insert(this._leftRankItems, insertIndex, rankItem);
        this._leftSide.insertWidget(insertIndex, item);
      }
    } else if (align === 'right') {
      let insertIndex = this._findInsertIndex(this._rightRankItems, rankItem);
      if (insertIndex === -1) {
        this._rightSide.addWidget(item);
        this._rightRankItems.push(rankItem);
      } else {
        ArrayExt.insert(this._rightRankItems, insertIndex, rankItem);
        this._rightSide.insertWidget(insertIndex, item);
      }
    } else {
      this._middlePanel.addWidget(item);
    }
    this._refreshItem(id); // Initially refresh the status item.

    const disposable = new DisposableDelegate(() => {
      delete this._statusItems[id];
      if (statusItem.activeStateChanged) {
        statusItem.activeStateChanged.disconnect(onActiveStateChanged);
      }
      item.parent = null;
      item.dispose();
    });
    this._disposables.add(disposable);
    return disposable;
  }

  /**
   * Dispose of the status bar.
   */
  dispose() {
    this._leftRankItems.length = 0;
    this._rightRankItems.length = 0;
    this._disposables.dispose();
    super.dispose();
  }

  /**
   * Handle an 'update-request' message to the status bar.
   */
  protected onUpdateRequest(msg: Message) {
    this._refreshAll();
    super.onUpdateRequest(msg);
  }

  private _findInsertIndex(
    side: Private.IRankItem[],
    newItem: Private.IRankItem
  ): number {
    return ArrayExt.findFirstIndex(side, item => item.rank > newItem.rank);
  }

  private _refreshItem(id: string) {
    const statusItem = this._statusItems[id];
    if (statusItem.isActive()) {
      statusItem.item.show();
      statusItem.item.update();
    } else {
      statusItem.item.hide();
    }
  }

  private _refreshAll(): void {
    Object.keys(this._statusItems).forEach(id => {
      this._refreshItem(id);
    });
  }

  private _leftRankItems: Private.IRankItem[] = [];
  private _rightRankItems: Private.IRankItem[] = [];
  private _statusItems: { [id: string]: IStatusBar.IItem } = {};
  private _disposables = new DisposableSet();
  private _leftSide: Panel;
  private _middlePanel: Panel;
  private _rightSide: Panel;
}

/**
 * A namespace for private functionality.
 */
namespace Private {
  type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
  /**
   * Default options for a status item, less the item itself.
   */
  export const statusItemDefaults: Omit<IStatusBar.IItem, 'item'> = {
    align: 'left',
    rank: 0,
    isActive: () => true,
    activeStateChanged: undefined
  };

  /**
   * An interface for storing the rank of a status item.
   */
  export interface IRankItem {
    id: string;
    rank: number;
  }
}
