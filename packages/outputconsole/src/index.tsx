// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { StackedPanel, Widget, Panel } from '@phosphor/widgets';

import { Token } from '@phosphor/coreutils';

import { ISignal, Signal } from '@phosphor/signaling';

import { Kernel, KernelMessage } from '@jupyterlab/services';

import { nbformat } from '@jupyterlab/coreutils';

import {
  OutputArea,
  IOutputAreaModel,
  OutputAreaModel,
  IOutputPrompt
} from '@jupyterlab/outputarea';

import {
  IRenderMimeRegistry,
  IOutputModel,
  OutputModel
} from '@jupyterlab/rendermime';
import { Message } from '@phosphor/messaging';

/* tslint:disable */
/**
 * The Output Log Registry token.
 */
export const IOutputLogRegistry = new Token<IOutputLogRegistry>(
  '@jupyterlab/outputconsole:IOutputLogRegistry'
);

export interface IOutputLogRegistry {
  getLogger(name: string): ILogger;
  getLoggers(): ILogger[];

  /**
   * A signal emitted when the log registry changes.
   */
  readonly registryChanged: ISignal<this, ILogRegistryChange>;
}

export interface IOutputWithTimestamp extends nbformat.IBaseOutput {
  timestamp: number;
}

type IOutputWithTimestampType = nbformat.IOutput | IOutputWithTimestamp;

export interface ILogger {
  log(log: nbformat.IOutput): void;
  clear(): void;
  readonly length: number;
  rendermime: IRenderMimeRegistry;
  /**
   * A signal emitted when the log changes.
   */
  readonly logChanged: ISignal<this, ILoggerChange>;
  readonly source: string;
  readonly outputAreaModel: LoggerOutputAreaModel;
}

export class Logger implements ILogger {
  constructor(source: string) {
    this.source = source;
  }

  get length(): number {
    return this._count;
  }

  /**
   * A signal emitted when the log model changes.
   */
  get logChanged(): ISignal<this, ILoggerChange> {
    return this._logChanged;
  }

  log(log: nbformat.IOutput) {
    const timestamp = new Date();
    this.outputAreaModel.add({ ...log, timestamp: timestamp.valueOf() });
    this._count++;
    this._logChanged.emit('append');
  }

  clear() {
    this.outputAreaModel.clear(false);
    this._count = 0;
    this._logChanged.emit('clear');
  }

  private _count = 0;
  private _logChanged = new Signal<this, ILoggerChange>(this);
  readonly source: string;
  readonly outputAreaModel = new LoggerOutputAreaModel({
    contentFactory: new LoggerModelFactory()
  });
  rendermime: IRenderMimeRegistry | null = null;
}

export type ILogRegistryChange = 'append' | 'remove';
export type ILoggerChange = 'append' | 'clear';

export class OutputLogRegistry implements IOutputLogRegistry {
  getLogger(name: string): ILogger {
    const loggers = this._loggers;
    let logger = loggers.get(name);
    if (logger) {
      return logger;
    }

    logger = new Logger(name);
    loggers.set(name, logger);

    this._registryChanged.emit('append');

    return logger;
  }

  getLoggers(): ILogger[] {
    return Array.from(this._loggers.values());
  }

  /**
   * A signal emitted when the log registry changes.
   */
  get registryChanged(): ISignal<this, ILogRegistryChange> {
    return this._registryChanged;
  }

  private _loggers = new Map<string, Logger>();
  private _registryChanged = new Signal<this, ILogRegistryChange>(this);
}

export class LoggerOutputArea extends OutputArea {
  /**
   * Handle an input request from a kernel by doing nothing.
   */
  protected onInputRequest(
    msg: KernelMessage.IInputRequestMsg,
    future: Kernel.IShellFuture
  ): void {
    return;
  }

  /**
   * Create an output item with a prompt and actual output
   */
  protected createOutputItem(model: LoggerOutputModel): Widget | null {
    const panel = super.createOutputItem(model) as Panel;
    (panel.widgets[0] as LoggerOutputPrompt).timestamp = model.timestamp;
    return panel;
  }

  readonly model: LoggerOutputAreaModel;
}

export class LoggerOutputAreaModel extends OutputAreaModel {
  constructor(options?: IOutputAreaModel.IOptions) {
    super(options);
  }

  set messageLimit(limit: number) {
    this._messageLimit = limit;
    this.applyLimit();
  }

  applyLimit() {
    if (this.list.length > this._messageLimit) {
      const diff = this.list.length - this._messageLimit;
      this.list.removeRange(0, diff);
      this.trusted = false;
    }
  }

  private _messageLimit: number = 1000;
}

export class LoggerOutputModel extends OutputModel {
  constructor(options: LoggerOutputModel.IOptions) {
    super(options);

    this.timestamp = new Date(options.value.timestamp as number);
  }

  timestamp: Date = null;
}

export namespace LoggerOutputModel {
  export interface IOptions extends IOutputModel.IOptions {
    value: IOutputWithTimestampType;
  }
}

/**
 * The default implementation of `IContentFactory`.
 */
export class LoggerModelFactory extends OutputAreaModel.ContentFactory {
  /**
   * Create an output model.
   */
  createOutputModel(options: IOutputModel.IOptions): LoggerOutputModel {
    return new LoggerOutputModel(options);
  }
}

/**
 * A List View widget that shows Output Console logs.
 */
export class OutputLoggerView extends StackedPanel {
  /**
   * Construct an OutputConsoleView instance.
   */
  constructor(outputLogRegistry: IOutputLogRegistry) {
    super();

    this._outputLogRegistry = outputLogRegistry;
    this.addClass('jlab-output-logger-view');
    this.node.style.overflowY = 'auto'; // TODO: use CSS class

    outputLogRegistry.registryChanged.connect(
      (sender: IOutputLogRegistry, args: ILogRegistryChange) => {
        const loggers = this._outputLogRegistry.getLoggers();
        for (let logger of loggers) {
          // TODO: optimize
          logger.logChanged.connect((sender: ILogger, args: ILoggerChange) => {
            this._updateOutputViews();
          });
        }
      }
    );
  }

  protected onAfterAttach(msg: Message): void {
    this._updateOutputViews();
  }

  get outputLogRegistry(): IOutputLogRegistry {
    return this._outputLogRegistry;
  }

  private _showOutputFromSource(source: string) {
    const viewId = `source:${source}`;

    this._outputViews.forEach((outputView: LoggerOutputArea, name: string) => {
      if (outputView.id === viewId) {
        outputView.show();
        this._scrollOuputViewToBottom(outputView);
      } else {
        outputView.hide();
      }
    });

    const title = `Log: ${source}`;
    this.title.label = title;
    this.title.caption = title;
  }

  set activeSource(name: string) {
    this._activeSource = name;
    this._showOutputFromSource(this._activeSource);
  }

  get activeSource(): string {
    return this._activeSource;
  }

  private _scrollOuputViewToBottom(outputView: LoggerOutputArea) {
    outputView.node.scrollTo({
      left: 0,
      top: outputView.node.scrollHeight,
      behavior: 'smooth'
    });
  }

  private _updateOutputViews() {
    const loggerIds = new Set<string>();
    const loggers = this._outputLogRegistry.getLoggers();

    for (let logger of loggers) {
      const viewId = `source:${logger.source}`;
      loggerIds.add(viewId);

      // add view for logger if not exist
      // TODO: or rendermime changed
      if (!this._outputViews.has(viewId)) {
        const outputView = new LoggerOutputArea({
          rendermime: logger.rendermime,
          contentFactory: new LoggerContentFactory(),
          model: logger.outputAreaModel
        });
        outputView.id = viewId;

        logger.logChanged.connect((sender: ILogger, args: ILoggerChange) => {
          this._scrollOuputViewToBottom(outputView);
        });

        outputView.outputLengthChanged.connect(
          (sender: LoggerOutputArea, args: number) => {
            outputView.model.applyLimit();
          }
        );

        this.addWidget(outputView);
        this._outputViews.set(viewId, outputView);
      }
    }

    // remove views that do not have corresponding loggers anymore
    const viewIds = this._outputViews.keys();

    for (let viewId of viewIds) {
      if (!loggerIds.has(viewId)) {
        const outputView = this._outputViews.get(viewId);
        outputView.dispose();
        this._outputViews.delete(viewId);
      }
    }
  }

  /**
   * Sets message entry limit.
   */
  set messageLimit(limit: number) {
    if (limit > 0) {
      this._outputViews.forEach((outputView: LoggerOutputArea) => {
        const model = outputView.model;
        model.messageLimit = limit;
      });
    }
  }

  private _outputLogRegistry: IOutputLogRegistry;
  private _outputViews = new Map<string, LoggerOutputArea>();
  private _activeSource: string = null;
}

/**
 * The default output prompt implementation
 */
class LoggerOutputPrompt extends Widget implements IOutputPrompt {
  constructor() {
    super();

    this._timestampNode = document.createElement('div');
    this.node.append(this._timestampNode);
  }

  set timestamp(value: Date) {
    this._timestampNode.innerHTML = value.toLocaleTimeString();
  }

  /**
   * The execution count for the prompt.
   */
  executionCount: nbformat.ExecutionCount;

  private _timestampNode: HTMLDivElement;
}

/**
 * The default implementation of `IContentFactory`.
 */
export class LoggerContentFactory extends OutputArea.ContentFactory {
  /**
   * Create the output prompt for the widget.
   */
  createOutputPrompt(): LoggerOutputPrompt {
    return new LoggerOutputPrompt();
  }
}
