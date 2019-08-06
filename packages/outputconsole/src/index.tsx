/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Widget } from '@phosphor/widgets';

import { Token } from '@phosphor/coreutils';

import { ISignal, Signal } from '@phosphor/signaling';

import { Message } from '@phosphor/messaging';

import {
  ToolbarButton,
  ReactWidget,
  MainAreaWidget
} from '@jupyterlab/apputils';

import { nbformat } from '@jupyterlab/coreutils';

import { OutputArea, OutputAreaModel } from '@jupyterlab/outputarea';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { KernelMessage } from '@jupyterlab/services';

import { HTMLSelect } from '@jupyterlab/ui-components';

import React from 'react';

/**
 * The class name added to toolbar filter option dropdown.
 */
const TOOLBAR_FILTER_DROPDOWN_CLASS = 'lab-output-console-dropdown';

/* tslint:disable */
/**
 * The Output Console token.
 */
export const IOutputConsole = new Token<IOutputConsole>(
  '@jupyterlab/outputconsole:IOutputConsole'
);

/**
 * The description of the log message.
 */
export interface IOutputLogPayload {
  sourceName?: string;
  sourceIconClassName?: string;
  msg: KernelMessage.IIOPubMessage;
  date?: Date;
}

/**
 * The description of the log message filter.
 */
export interface IOutputLogFilter {
  /**
   * Filter by request source name.
   */
  sourceName?: string;
}

/**
 * Output Console interface.
 */
export interface IOutputConsole {
  logMessage(payload: IOutputLogPayload): void;
  onLogMessage(
    filter?: IOutputLogFilter
  ): ISignal<IOutputConsole, IOutputLogPayload>;
  logCount(filter?: IOutputLogFilter): number;
}

/**
 * An extended version of Signal that emits
 * output logs after filtering.
 */
export class FilteredOutputLogSignal extends Signal<
  IOutputConsole,
  IOutputLogPayload
> {
  /**
   * Construct a FilteredOutputLogSignal object
   */
  constructor(sender: IOutputConsole, filter?: IOutputLogFilter) {
    super(sender);

    this._filter = filter;
  }

  /**
   * Emit an Output Log ony if it passes the filter.
   */
  emit(args: IOutputLogPayload): void {
    if (OutputConsole.applyFilter(args, this._filter)) {
      super.emit(args);
    }
  }

  private _filter: IOutputLogFilter;
}

/**
 * The concrete implementation of IOutputConsole.
 * Stores log messages and sends notification signals.
 */
export class OutputConsole implements IOutputConsole {
  /**
   * Log a new output message and notify listeners.
   */
  logMessage(payload: IOutputLogPayload) {
    if (!payload.date) {
      payload.date = new Date();
    }

    this._messages.push(payload);

    this._signals.forEach(signal => {
      signal.emit(payload);
    });
  }

  /**
   * Returns a filtered signal object to observe message log events.
   * If filter parameter is provided, only the messages that pass the
   * filter trigger a new signal event.
   */
  onLogMessage(
    filter?: IOutputLogFilter
  ): ISignal<IOutputConsole, IOutputLogPayload> {
    const signalKey = OutputConsole._filterAsKey(filter);
    let signal = this._signals.get(signalKey);
    if (!signal) {
      signal = new FilteredOutputLogSignal(this, filter);
      this._signals.set(signalKey, signal);
    }

    return signal;
  }

  /**
   * Returns number of logs. If filter parameter is provided,
   * only the messages that pass the filter are counted.
   */
  logCount(filter?: IOutputLogFilter): number {
    if (filter) {
      let count = 0;
      for (let message of this._messages) {
        if (OutputConsole.applyFilter(message, filter)) {
          count++;
        }
      }

      return count;
    }

    return this._messages.length;
  }

  /**
   * Clears all messages logged.
   */
  clearMessages(): void {
    this._messages = [];
  }

  /**
   * Returns all messages stored.
   */
  get messages(): IOutputLogPayload[] {
    return this._messages;
  }

  /**
   * Applies filter to a log message.
   * Returns true if message passes the filter.
   */
  static applyFilter(
    log: IOutputLogPayload,
    filter?: IOutputLogFilter
  ): boolean {
    const sourceName = filter ? filter.sourceName : undefined;
    if (sourceName) {
      return log.sourceName === sourceName;
    }

    return true;
  }

  /**
   * Compares two filters.
   * Returns true if filters are the same.
   */
  static compareFilters(lhs: IOutputLogFilter, rhs: IOutputLogFilter): boolean {
    return lhs === rhs || (lhs && rhs && lhs.sourceName === rhs.sourceName);
  }

  /**
   * Convert a filter object to a unique string key.
   */
  private static _filterAsKey(filter?: IOutputLogFilter): string {
    if (filter && filter.sourceName) {
      return `filter:source:${filter.sourceName}`;
    }
    return `filter:undefined`;
  }

  private _messages: IOutputLogPayload[] = [];
  private _signals: Map<
    string,
    Signal<IOutputConsole, IOutputLogPayload>
  > = new Map();
}

/**
 * A List View widget that shows Output Console logs.
 */
class OutputConsoleView extends Widget {
  /**
   * Construct an OutputConsoleView instance.
   */
  constructor(rendermime: IRenderMimeRegistry) {
    super();

    this.title.closable = true;
    this.title.label = 'Output Console';
    this.title.iconClass = 'fa fa-list lab-output-console-icon';

    this._rendermime = rendermime;
    this.node.style.overflowY = 'auto'; // TODO: use CSS class

    this._outputConsole = new OutputConsole();

    this._outputConsole.onLogMessage().connect(this._onLogMessage, this);

    this.node.addEventListener('click', event => {
      const el = event.srcElement as HTMLElement;
      if (!el) {
        return;
      }

      let sourceName = undefined;

      if (el.classList.contains('log-sender')) {
        sourceName = el.dataset['sourceName'];
      } else if (el.classList.contains('log-sender-icon')) {
        sourceName = el.parentElement.dataset['sourceName'];
      }

      if (sourceName) {
        this._messageSourceClicked.emit(sourceName);
        event.stopPropagation();
      }
    });
  }

  /**
   * Get Output Console instance
   * which handles log message management.
   */
  get outputConsole(): OutputConsole {
    return this._outputConsole;
  }

  /**
   * Get console log message count.
   */
  get logCount(): number {
    return this._outputConsole.logCount();
  }

  /**
   * Clear console log messages from list view and
   * from output console storage.
   */
  clearMessages(): void {
    this._clearMessageList();

    return this._outputConsole.clearMessages();
  }

  /**
   * Clear console log messages from list view only.
   */
  private _clearMessageList(): void {
    while (this.node.lastChild) {
      this.node.removeChild(this.node.lastChild);
    }
  }

  /**
   * Handle Output Console new message log event.
   */
  private _onLogMessage(sender: IOutputConsole, args: IOutputLogPayload): void {
    // if Output Console is visible, update the list
    if (this.isAttached) {
      this.updateListView(this._lastFilter);
    }
  }

  /**
   * Last filter applied to Output Console list view.
   */
  get lastFilter(): IOutputLogFilter {
    return this._lastFilter;
  }

  /**
   * Message source clicked signal which is emitted
   * when user clicks name or icon of the source in list view.
   */
  get messageSourceClicked(): Signal<this, string> {
    return this._messageSourceClicked;
  }

  /**
   * Update message list by applying filter parameter supplied
   */
  updateListView(filter?: IOutputLogFilter) {
    this._clearMessageList();

    const messages = this._outputConsole.messages;
    let index = 0;

    for (let log of messages) {
      if (!OutputConsole.applyFilter(log, filter)) {
        continue;
      }

      index++;
      const output = log.msg.content as nbformat.IOutput;
      output.output_type = log.msg.header.msg_type as nbformat.OutputType;

      const outputView = new OutputArea({
        rendermime: this._rendermime,
        contentFactory: OutputArea.defaultContentFactory,
        model: new OutputAreaModel()
      });

      outputView.update();

      const logTime = log.date!.toLocaleTimeString();
      const logLine = document.createElement('div');
      logLine.className = 'lab-output-console-line';
      logLine.innerHTML = `
      <div class="log-meta">
        <div class="log-count-time">
          <div class="log-count">${index})</div>
          <div class="log-time">${logTime}</div>
        </div>
        <div class="log-sender" data-source-name="${log.sourceName}" title="${
        log.sourceName
      }, click to filter">
          <div class="log-sender-icon ${
            log.sourceIconClassName ? log.sourceIconClassName : ''
          }"></div>
          ${log.sourceName}
        </div>
      </div>
      <div class="log-content"></div>`;

      this.node.appendChild(logLine);

      logLine.querySelector('.log-content').appendChild(outputView.node);

      outputView.model.add(output);
    }

    this.node.scrollTo({
      left: 0,
      top: this.node.scrollHeight,
      behavior: 'smooth'
    });

    this._lastFilter = filter;
  }

  private _outputConsole: OutputConsole = null;
  private _rendermime: IRenderMimeRegistry;
  private _lastFilter: IOutputLogFilter;
  private _messageSourceClicked: Signal<this, string> = new Signal<
    this,
    string
  >(this);
}

/**
 * A toolbar widget that switches filter options.
 */
export class FilterSelect extends ReactWidget {
  /**
   * Construct a new filter switcher.
   */
  constructor(outputConsoleWidget: OutputConsoleWidget) {
    super();
    this._outputConsoleWidget = outputConsoleWidget;

    const outputConsole = this._outputConsoleWidget.outputConsole;

    outputConsole
      .onLogMessage()
      .connect((sender: IOutputConsole, args: IOutputLogPayload): void => {
        this._updateFilterOptions();
      });

    this._outputConsoleWidget.logsCleared.connect(() => {
      this._currentOption = FilterSelect._defaultOption;
      this._updateFilterOptions();
    });

    this._updateFilterOptions();
  }

  private _updateFilterOptions() {
    const outputConsole = this._outputConsoleWidget.outputConsole;
    this._filterOptions.clear();
    this._filterOptions.add('Show All');

    outputConsole.messages.forEach((payload: IOutputLogPayload) => {
      this._filterOptions.add(payload.sourceName);
    });

    this.update();
  }

  /**
   * Handle `change` events for the HTMLSelect component.
   */
  handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    this._currentOption = event.target.value;

    const filter: IOutputLogFilter =
      this._currentOption === FilterSelect._defaultOption
        ? undefined
        : { sourceName: this._currentOption };

    this._outputConsoleWidget.updateListView(filter);
  };

  render() {
    let filterList: any[] = [];
    this._filterOptions.forEach((item: string) => {
      filterList.push(<option value={item}>{item}</option>);
    });

    return [
      <span className="jp-ToolbarButtonComponent-label">Filter </span>,
      <HTMLSelect
        className={TOOLBAR_FILTER_DROPDOWN_CLASS}
        onChange={this.handleChange}
        value={this._currentOption}
        iconProps={{
          icon: <span className="jp-MaterialIcon jp-DownCaretIcon bp3-icon" />
        }}
        minimal
      >
        {filterList}
      </HTMLSelect>
    ];
  }

  /**
   * Select corresponding option for the given filter parameter.
   */
  selectOptionForFilter(filter?: IOutputLogFilter) {
    if (filter) {
      if (filter.sourceName && this._filterOptions.has(filter.sourceName)) {
        this._currentOption = filter.sourceName;
      }
    } else {
      this._currentOption = FilterSelect._defaultOption;
    }

    this.update();
  }

  private _outputConsoleWidget: OutputConsoleWidget = null;
  private _filterOptions: Set<string> = new Set();
  private static _defaultOption: string = 'Show All';
  private _currentOption: string = FilterSelect._defaultOption;
}

/**
 * A Tab Panel with a toolbar and a list that shows
 * Output Console logs.
 */
export class OutputConsoleWidget extends MainAreaWidget<OutputConsoleView> {
  /**
   * Construct an OutputConsoleWidget instance.
   */
  constructor(rendermime: IRenderMimeRegistry) {
    super({ content: new OutputConsoleView(rendermime) });

    this.addClass('lab-output-console-widget');

    this._filterSelect = new FilterSelect(this);
    const clearButton = new ToolbarButton({
      onClick: (): void => {
        this.content.clearMessages();
        this._logsCleared.emit();
      },
      iconClassName: 'fa fa-ban clear-icon',
      tooltip: 'Clear Messages',
      label: 'Clear Messages'
    });
    this.toolbar.addItem('lab-output-console-filter', this._filterSelect);
    this.toolbar.addItem('lab-output-console-clear', clearButton);

    this.content.messageSourceClicked.connect(
      (sender: OutputConsoleView, sourceName: string) => {
        this.updateListView({ sourceName: sourceName });
      }
    );
  }

  /**
   * Widget After Attach event handler.
   */
  onAfterAttach(msg: Message) {
    this._madeVisible.emit();
  }

  /**
   * Get Output Console instance
   * which handles log message management.
   */
  get outputConsole(): OutputConsole {
    return this.content.outputConsole;
  }

  /**
   * Get logs cleared signal which is emitted
   * when user click Clear toolbar button.
   */
  get logsCleared(): ISignal<this, void> {
    return this._logsCleared;
  }

  /**
   * Get made visible signal which is emitted
   * when tab panel gets activated.
   */
  get madeVisible(): ISignal<this, void> {
    return this._madeVisible;
  }

  /**
   * Last filter applied to Output Console list view.
   */
  get lastFilter(): IOutputLogFilter {
    return this.content.lastFilter;
  }

  /**
   * Update message list by applying filter parameter supplied
   */
  updateListView(filter?: IOutputLogFilter) {
    this.content.updateListView(filter);
    this._filterSelect.selectOptionForFilter(filter);
  }

  private _logsCleared = new Signal<this, void>(this);
  private _madeVisible = new Signal<this, void>(this);
  private _filterSelect: FilterSelect;
}
