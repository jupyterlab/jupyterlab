import { Widget, Panel, PanelLayout } from '@phosphor/widgets';

import { Token } from '@phosphor/coreutils';

import { ApplicationShell } from '@jupyterlab/application';
import { ArrayExt } from '@phosphor/algorithm';
import { ISignal } from '@phosphor/signaling';

// tslint:disable-next-line:variable-name
export const IStatusBar = new Token<IStatusBar>(
    'jupyterlab-statusbar/IStatusBar'
);

export interface IStatusBar {
    registerStatusItem(
        id: string,
        widget: Widget,
        opts: IStatusBar.IItemOptions
    ): void;
}

export namespace IStatusBar {
    export type Alignment = 'right' | 'left' | 'middle';

    export interface IItemOptions {
        align?: IStatusBar.Alignment;
        priority?: number;
        isActive?: () => boolean;
        stateChanged?: ISignal<any, void>;
    }
}

const STATUS_BAR_ID = 'jp-main-status-bar';

const STATUS_BAR_CLASS = 'jp-status-bar';
const STATUS_BAR_SIDE_CLASS = 'jp-status-bar-side';
const STATUS_BAR_LEFT_SIDE_CLASS = 'jp-status-bar-left';
const STATUS_BAR_MIDDLE_PANEL_CLASS = 'jp-status-bar-middle';
const STATUS_BAR_RIGHT_SIDE_CLASS = 'jp-status-bar-right';
const STATUS_BAR_ITEM_CLASS = 'jp-status-bar-item';

export class StatusBar extends Widget implements IStatusBar {
    constructor(options: StatusBar.IOptions) {
        super();

        this._host = options.host;

        this.id = STATUS_BAR_ID;
        this.addClass(STATUS_BAR_CLASS);

        let rootLayout = (this.layout = new PanelLayout());

        let leftPanel = (this._leftSide = new Panel());
        let middlePanel = (this._middlePanel = new Panel());
        let rightPanel = (this._rightSide = new Panel());

        leftPanel.addClass(STATUS_BAR_SIDE_CLASS);
        leftPanel.addClass(STATUS_BAR_LEFT_SIDE_CLASS);

        middlePanel.addClass(STATUS_BAR_SIDE_CLASS);
        middlePanel.addClass(STATUS_BAR_MIDDLE_PANEL_CLASS);

        rightPanel.addClass(STATUS_BAR_SIDE_CLASS);
        rightPanel.addClass(STATUS_BAR_RIGHT_SIDE_CLASS);

        rootLayout.addWidget(leftPanel);
        rootLayout.addWidget(middlePanel);
        rootLayout.addWidget(rightPanel);

        this._host.addToBottomArea(this);
        this._host.currentChanged.connect(this._onAppShellCurrentChanged);
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

        let wrapper = {
            widget,
            align,
            priority,
            isActive,
            stateChanged
        };

        let rankItem = {
            id,
            priority
        };

        widget.addClass(STATUS_BAR_ITEM_CLASS);

        this._statusItems[id] = wrapper;
        this._statusIds.push(id);

        if (stateChanged) {
            stateChanged.connect(() => {
                this._onIndividualStateChange(id);
            });
        }

        if (align === 'left') {
            let insertIndex = this._findInsertIndex(
                this._leftRankItems,
                rankItem
            );
            if (insertIndex === -1) {
                this._leftSide.addWidget(widget);
                this._leftRankItems.push(rankItem);
            } else {
                ArrayExt.insert(this._leftRankItems, insertIndex, rankItem);
                this._leftSide.insertWidget(insertIndex, widget);
            }
        } else if (align === 'right') {
            let insertIndex = this._findInsertIndex(
                this._rightRankItems,
                rankItem
            );
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
     * Get the parent ApplicationShell
     */
    get host(): ApplicationShell {
        return this._host;
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

    private _onAppShellCurrentChanged = () => {
        this._statusIds.forEach(statusId => {
            const { widget, isActive } = this._statusItems[statusId];
            if (isActive()) {
                widget.show();
            } else {
                widget.hide();
            }
        });
    };

    private _onIndividualStateChange = (statusId: string) => {
        const { widget, isActive } = this._statusItems[statusId];
        if (isActive()) {
            widget.show();
        } else {
            widget.hide();
        }
    };

    private _leftRankItems: StatusBar.IRankItem[] = [];
    private _rightRankItems: StatusBar.IRankItem[] = [];
    private _statusItems: { [id: string]: StatusBar.IItem } = Object.create(
        null
    );
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
    }
}
