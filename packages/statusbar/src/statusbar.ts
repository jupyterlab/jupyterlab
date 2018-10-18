// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ApplicationShell } from '@jupyterlab/application';

import { ArrayExt } from '@phosphor/algorithm';

import { ISignal } from '@phosphor/signaling';

import { Token } from '@phosphor/coreutils';

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
   * @param widget - The item to add to the status bar.
   *
   * @param options - The options for how to add the status item.
   */
  registerStatusItem(
    id: string,
    widget: Widget,
    options: IStatusBar.IItemOptions
  ): void;
}

/**
 * A namespace for status bar statics.
 */
export namespace IStatusBar {
  export type Alignment = 'right' | 'left' | 'middle';

  /**
   * Options for status bar items.
   */
  export interface IItemOptions {
    /**
     * Which side to place widget. Permanent widgets are intended for the right and left side, with more transient widgets in the middle.
     */
    align?: Alignment;
    /**
     *  Ordering of Items -- higher rank items are closer to the middle.
     */
    rank?: number;
    /**
     * Whether the widget is shown or hidden.
     */
    isActive?: () => boolean;
    /**
     * Determine when the widget updates.
     */
    stateChanged?: ISignal<any, void>;
  }
}

/**
 * The DOM id for the status bar.
 */
const STATUS_BAR_ID = 'jp-main-status-bar';

/**
 * Main status bar object which contains all widgets.
 */
export class StatusBar extends Widget implements IStatusBar {
  constructor(options: StatusBar.IOptions) {
    super();

    this._host = options.host;

    this.id = STATUS_BAR_ID;
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

    this._host.addToBottomArea(this);
    this._host.currentChanged.connect(this._onAppShellCurrentChanged);
    this._host.restored
      .then(() => {
        this.update();
      })
      .catch(() => {
        console.error(`Failed to refresh statusbar items`);
      });
  }

  /**
   * Register a new status item.
   *
   * @param id - a unique id for the status item.
   *
   * @param widget - The item to add to the status bar.
   *
   * @param options - The options for how to add the status item.
   */
  registerStatusItem(
    id: string,
    widget: Widget,
    options: IStatusBar.IItemOptions = {}
  ): void {
    if (id in this._statusItems) {
      throw new Error(`Status item ${id} already registered.`);
    }

    let align = options.align || 'left';
    let rank = options.rank || 0;
    let isActive = options.isActive || (() => true);
    let stateChanged = options.stateChanged || null;
    let changeCallback =
      options.stateChanged !== undefined
        ? () => {
            this._onIndividualStateChange(id);
          }
        : null;

    let wrapper = {
      widget,
      align,
      rank,
      isActive,
      stateChanged,
      changeCallback
    };

    let rankItem = {
      id,
      rank
    };

    widget.addClass(itemStyle);

    this._statusItems[id] = wrapper;
    this._statusIds.push(id);

    if (stateChanged) {
      stateChanged.connect(changeCallback!);
    }

    if (align === 'left') {
      let insertIndex = this._findInsertIndex(this._leftRankItems, rankItem);
      if (insertIndex === -1) {
        this._leftSide.addWidget(widget);
        this._leftRankItems.push(rankItem);
      } else {
        ArrayExt.insert(this._leftRankItems, insertIndex, rankItem);
        this._leftSide.insertWidget(insertIndex, widget);
      }
    } else if (align === 'right') {
      let insertIndex = this._findInsertIndex(this._rightRankItems, rankItem);
      if (insertIndex === -1) {
        this._rightSide.addWidget(widget);
        this._rightRankItems.push(rankItem);
      } else {
        ArrayExt.insert(this._rightRankItems, insertIndex, rankItem);
        this._rightSide.insertWidget(insertIndex, widget);
      }
    } else {
      this._middlePanel.addWidget(widget);
    }
  }

  /**
   * Dispose of the status bar.
   */
  dispose() {
    super.dispose();

    this._host.currentChanged.disconnect(this._onAppShellCurrentChanged);
    this._statusIds.forEach(id => {
      const { stateChanged, changeCallback, widget } = this._statusItems[id];

      if (stateChanged) {
        stateChanged.disconnect(changeCallback!);
      }

      widget.dispose();
    });
  }

  /**
   * Handle an 'update-request' message to the status bar.
   */
  protected onUpdateRequest(msg: Message) {
    this._statusIds.forEach(statusId => {
      this._statusItems[statusId].widget.update();
    });

    this._refreshAll();
    super.onUpdateRequest(msg);
  }

  private _findInsertIndex(
    side: Private.IRankItem[],
    newItem: Private.IRankItem
  ): number {
    return ArrayExt.findFirstIndex(side, item => item.rank > newItem.rank);
  }

  private _refreshItem({ isActive, widget }: StatusBar.IItem) {
    if (isActive()) {
      widget.show();
    } else {
      widget.hide();
    }
  }

  private _refreshAll(): void {
    this._statusIds.forEach(statusId => {
      this._refreshItem(this._statusItems[statusId]);
    });
  }

  private _onAppShellCurrentChanged = () => {
    this._refreshAll();
  };

  private _onIndividualStateChange = (statusId: string) => {
    this._refreshItem(this._statusItems[statusId]);
  };

  private _leftRankItems: Private.IRankItem[] = [];
  private _rightRankItems: Private.IRankItem[] = [];
  private _statusItems: { [id: string]: StatusBar.IItem } = Object.create(null);
  private _statusIds: Array<string> = [];

  private _host: ApplicationShell;

  private _leftSide: Panel;
  private _middlePanel: Panel;
  private _rightSide: Panel;
}

export namespace StatusBar {
  /**
   * Options for creating a new StatusBar instance
   */
  export interface IOptions {
    host: ApplicationShell;
  }

  /**
   * The interface for a status bar item.
   */
  export interface IItem {
    align: IStatusBar.Alignment;
    rank: number;
    widget: Widget;
    isActive: () => boolean;
    stateChanged: ISignal<any, void> | null;
    changeCallback: (() => void) | null;
  }
}

/**
 * A namespace for private functionality.
 */
namespace Private {
  /**
   * An interface for storing the rank of a status item.
   */
  export interface IRankItem {
    id: string;
    rank: number;
  }
}
