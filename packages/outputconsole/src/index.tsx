/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Widget, BoxLayout } from '@phosphor/widgets';

import { UUID, Token } from '@phosphor/coreutils';

import { ISignal, Signal } from '@phosphor/signaling';

import { Message } from '@phosphor/messaging';

import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';

import { nbformat } from '@jupyterlab/coreutils';

import { OutputArea, OutputAreaModel } from '@jupyterlab/outputarea';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { KernelMessage } from '@jupyterlab/services';

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
   * Filter by request session id.
   */
  session?: string;
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
    if (filter && filter.session) {
      let count = 0;
      const sessionFilter = filter.session;
      for (let message of this._messages) {
        const session = (message.msg.parent_header as KernelMessage.IHeader)
          .session;
        if (session === sessionFilter) {
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
    const sessionFilter = filter ? filter.session : undefined;

    if (sessionFilter) {
      const msgSession = (log.msg.parent_header as KernelMessage.IHeader)
        .session;
      return msgSession === sessionFilter;
    }

    return true;
  }

  /**
   * Convert a filter object to a unique string key.
   */
  private static _filterAsKey(filter?: IOutputLogFilter): string {
    if (filter && filter.session) {
      return `filter:session:${filter.session}`;
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

    this._rendermime = rendermime;
    this.node.style.overflowY = 'auto'; // TODO: use CSS class

    this._outputConsole = new OutputConsole();
  }

  /**
   * Get Output Console instance
   * which handles log message management.
   */
  get outputConsole(): IOutputConsole {
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
   * Apply filter parameter supplied to messages shown in the list
   */
  applyFilter(filter?: IOutputLogFilter) {
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
        <div class="log-sender" title="${log.sourceName}">
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
  }

  private _outputConsole: OutputConsole = null;
  private _rendermime: IRenderMimeRegistry;
}

/**
 * A Tab Panel with a toolbar and a list that shows
 * Output Console logs.
 */
export class OutputConsoleWidget extends Widget {
  /**
   * Construct an OutputConsoleWidget instance.
   */
  constructor(rendermime: IRenderMimeRegistry) {
    super();

    this.id = UUID.uuid4();
    this.title.closable = true;
    this.title.label = 'Output Console';
    this.title.iconClass = 'fa fa-list lab-output-console-icon';
    this.addClass('lab-output-console-widget');

    this._consoleView = new OutputConsoleView(rendermime);
    this._consoleView.update();
    this._consoleView.activate();

    let toolbar = new Toolbar();
    let button = new ToolbarButton({
      onClick: (): void => {
        this._consoleView.clearMessages();
        this._logsCleared.emit();
      },
      iconClassName: 'fa fa-ban clear-icon',
      tooltip: 'Clear',
      label: 'Clear'
    });
    toolbar.addItem(name, button);
    toolbar.addItem('lab-output-console-clear', button);

    let layout = new BoxLayout();
    layout.addWidget(toolbar);
    layout.addWidget(this._consoleView);

    BoxLayout.setStretch(toolbar, 0);
    BoxLayout.setStretch(this._consoleView, 1);

    this.layout = layout;
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
  get outputConsole(): IOutputConsole {
    return this._consoleView.outputConsole;
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
   * Apply filter parameter supplied to messages shown in the list
   */
  applyFilter(filter?: IOutputLogFilter) {
    this._consoleView.applyFilter(filter);
  }

  private _consoleView: OutputConsoleView = null;
  private _logsCleared = new Signal<this, void>(this);
  private _madeVisible = new Signal<this, void>(this);
}
