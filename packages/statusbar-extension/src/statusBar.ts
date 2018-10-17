/**
 * Main status bar object which contains all widgets.
 */
/**
 *
 */
import { Widget, Panel, PanelLayout } from '@phosphor/widgets';
import { Token } from '@phosphor/coreutils';
import { ApplicationShell } from '@jupyterlab/application';
import { ArrayExt } from '@phosphor/algorithm';
import { ISignal } from '@phosphor/signaling';
import {
  statusBar as barStyle,
  side as sideStyle,
  item as itemStyle,
  leftSide as leftSideStyle,
  rightSide as rightSideStyle
} from './style/statusBar';
import { Message } from '@phosphor/messaging';

// tslint:disable-next-line:variable-name
export const IStatusBar = new Token<IStatusBar>(
  '@jupyterlab/statusbar:IStatusBar'
);

export interface IStatusBar {
  /**
   * Add an item to the status bar.
   * @param id Id of the widget to be displayed in the Settings Registry.
   * @param widget Widget added to the status bar.
   * @param opts
   */
  registerStatusItem(
    id: string,
    widget: Widget,
    opts: IStatusBar.IItemOptions
  ): void;
}

export namespace IStatusBar {
  export type Alignment = 'right' | 'left' | 'middle';

  /**
   * Options for status bar items.
   */
  export interface IItemOptions {
    /**
     * Which side to place widget. Permanent widgets are intended for the right and left side, with more transient widgets in the middle.
     */
    align?: IStatusBar.Alignment;
    /**
     *  Ordering of Items -- higher priority items are closer to the middle.
     */
    priority?: number;
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

  registerStatusItem(
    id: string,
    widget: Widget,
    opts: IStatusBar.IItemOptions = {}
  ) {
    if (id in this._statusItems) {
      throw new Error(`Status item ${id} already registered.`);
    }

    let align = opts.align ? opts.align : 'left';
    let priority = opts.priority !== undefined ? opts.priority : 0;
    let isActive = opts.isActive !== undefined ? opts.isActive : () => true;
    let stateChanged =
      opts.stateChanged !== undefined ? opts.stateChanged : null;
    let changeCallback =
      opts.stateChanged !== undefined
        ? () => {
            this._onIndividualStateChange(id);
          }
        : null;

    let wrapper = {
      widget,
      align,
      priority,
      isActive,
      stateChanged,
      changeCallback
    };

    let rankItem = {
      id,
      priority
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

  protected onUpdateRequest(msg: Message) {
    this._statusIds.forEach(statusId => {
      this._statusItems[statusId].widget.update();
    });

    this._refreshAll();
    super.onUpdateRequest(msg);
  }

  private _findInsertIndex(
    side: StatusBar.IRankItem[],
    newItem: StatusBar.IRankItem
  ): number {
    return ArrayExt.findFirstIndex(
      side,
      item => item.priority > newItem.priority
    );
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

  private _leftRankItems: StatusBar.IRankItem[] = [];
  private _rightRankItems: StatusBar.IRankItem[] = [];
  private _statusItems: { [id: string]: StatusBar.IItem } = Object.create(null);
  private _statusIds: Array<string> = [];

  private _host: ApplicationShell;

  private _leftSide: Panel;
  private _middlePanel: Panel;
  private _rightSide: Panel;
}

export namespace StatusBar {
  export interface IRankItem {
    id: string;
    priority: number;
  }

  /**
   * Options for creating a new StatusBar instance
   */
  export interface IOptions {
    host: ApplicationShell;
  }

  export interface IItem {
    align: IStatusBar.Alignment;
    priority: number;
    widget: Widget;
    isActive: () => boolean;
    stateChanged: ISignal<any, void> | null;
    changeCallback: (() => void) | null;
  }
}
