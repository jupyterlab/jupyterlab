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
export const ILoggerRegistry = new Token<ILoggerRegistry>(
  '@jupyterlab/logconsole:ILoggerRegistry'
);

export interface ILoggerRegistry {
  getLogger(source: string): ILogger;
  getLoggers(): ILogger[];

  /**
   * A signal emitted when the log registry changes.
   */
  readonly registryChanged: ISignal<this, ILoggerRegistryChange>;
}

interface ITimestampedOutput extends nbformat.IBaseOutput {
  timestamp: number;
}

export const DEFAULT_LOG_ENTRY_LIMIT: number = 1000;

type IOutputWithTimestamp = nbformat.IOutput | ITimestampedOutput;

export type ILoggerChange = 'append' | 'clear';

export interface ILogger {
  log(log: nbformat.IOutput): void;
  clear(): void;
  readonly length: number;
  rendermime: IRenderMimeRegistry;
  /**
   * A signal emitted when the log changes.
   */
  readonly logChanged: ISignal<this, ILoggerChange>;
  /**
   * A signal emitted when the rendermime changes.
   */
  readonly rendermimeChanged: ISignal<this, void>;
  readonly source: string;
  readonly outputAreaModel: LoggerOutputAreaModel;
}

class LogOutputModel extends OutputModel {
  constructor(options: LogOutputModel.IOptions) {
    super(options);

    this.timestamp = new Date(options.value.timestamp as number);
  }

  timestamp: Date = null;
}

namespace LogOutputModel {
  export interface IOptions extends IOutputModel.IOptions {
    value: IOutputWithTimestamp;
  }
}

/**
 * The default implementation of `IContentFactory`.
 */
class LogConsoleModelContentFactory extends OutputAreaModel.ContentFactory {
  /**
   * Create an output model.
   */
  createOutputModel(options: IOutputModel.IOptions): LogOutputModel {
    return new LogOutputModel(options);
  }
}

export class Logger implements ILogger {
  constructor(source: string) {
    this.source = source;
  }

  get length(): number {
    return this.outputAreaModel.length;
  }

  /**
   * A signal emitted when the log model changes.
   */
  get logChanged(): ISignal<this, ILoggerChange> {
    return this._logChanged;
  }

  /**
   * A signal emitted when the rendermime changes.
   */
  get rendermimeChanged(): ISignal<this, void> {
    return this._rendermimeChanged;
  }

  log(log: nbformat.IOutput) {
    const timestamp = new Date();
    this.outputAreaModel.add({ ...log, timestamp: timestamp.valueOf() });
    this._logChanged.emit('append');
  }

  clear() {
    this.outputAreaModel.clear(false);
    this._logChanged.emit('clear');
  }

  set rendermime(value: IRenderMimeRegistry | null) {
    if (value !== this._rendermime) {
      this._rendermime = value;
      this._rendermimeChanged.emit();
    }
  }

  get rendermime(): IRenderMimeRegistry | null {
    return this._rendermime;
  }

  readonly source: string;
  readonly outputAreaModel = new LoggerOutputAreaModel({
    contentFactory: new LogConsoleModelContentFactory()
  });
  private _logChanged = new Signal<this, ILoggerChange>(this);
  private _rendermimeChanged = new Signal<this, void>(this);
  private _rendermime: IRenderMimeRegistry | null = null;
}

export type ILoggerRegistryChange = 'append';

export class LoggerRegistry implements ILoggerRegistry {
  constructor(defaultRendermime: IRenderMimeRegistry) {
    this._defaultRendermime = defaultRendermime;
  }

  getLogger(source: string): ILogger {
    const loggers = this._loggers;
    let logger = loggers.get(source);
    if (logger) {
      return logger;
    }

    logger = new Logger(source);
    logger.rendermime = this._defaultRendermime;
    loggers.set(source, logger);

    this._registryChanged.emit('append');

    return logger;
  }

  getLoggers(): ILogger[] {
    return Array.from(this._loggers.values());
  }

  /**
   * A signal emitted when the log registry changes.
   */
  get registryChanged(): ISignal<this, ILoggerRegistryChange> {
    return this._registryChanged;
  }

  private _loggers = new Map<string, Logger>();
  private _registryChanged = new Signal<this, ILoggerRegistryChange>(this);
  private _defaultRendermime: IRenderMimeRegistry = null;
}

/**
 * The default output prompt implementation
 */
class LogConsoleOutputPrompt extends Widget implements IOutputPrompt {
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

class LogConsoleOutputArea extends OutputArea {
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
  protected createOutputItem(model: LogOutputModel): Widget | null {
    const panel = super.createOutputItem(model) as Panel;
    // first widget in panel is prompt of type LoggerOutputPrompt
    (panel.widgets[0] as LogConsoleOutputPrompt).timestamp = model.timestamp;
    return panel;
  }

  /**
   * The rendermime instance used by the widget.
   */
  rendermime: IRenderMimeRegistry;
  readonly model: LoggerOutputAreaModel;
}

class LoggerOutputAreaModel extends OutputAreaModel {
  constructor(options?: IOutputAreaModel.IOptions) {
    super(options);
  }

  set entryLimit(limit: number) {
    this._entryLimit = limit;
    this.applyLimit();
  }

  applyLimit() {
    if (this.list.length > this._entryLimit) {
      const diff = this.list.length - this._entryLimit;
      this.list.removeRange(0, diff);
      this.trusted = false;
    }
  }

  private _entryLimit: number = DEFAULT_LOG_ENTRY_LIMIT;
}

/**
 * The default implementation of `IContentFactory`.
 */
class LogConsoleContentFactory extends OutputArea.ContentFactory {
  /**
   * Create the output prompt for the widget.
   */
  createOutputPrompt(): LogConsoleOutputPrompt {
    return new LogConsoleOutputPrompt();
  }
}

/**
 * A List View widget that shows Output Console logs.
 */
export class LogConsolePanel extends StackedPanel {
  /**
   * Construct an OutputConsoleView instance.
   */
  constructor(loggerRegistry: ILoggerRegistry) {
    super();

    this._loggerRegistry = loggerRegistry;
    this.addClass('jp-LogConsolePanel');

    loggerRegistry.registryChanged.connect(
      (sender: ILoggerRegistry, args: ILoggerRegistryChange) => {
        this._bindLoggerSignals();
      },
      this
    );

    this._bindLoggerSignals();

    this._placeholder = new Widget();
    this._placeholder.addClass('jlab-output-logger-placeholder');
    this._placeholder.node.innerHTML = 'No log messages.';

    this.addWidget(this._placeholder);
  }

  protected onAfterAttach(msg: Message): void {
    this._updateOutputAreas();
    this._showOutputFromSource(this._activeSource);
    this._showPlaceholderIfNoMessage();
    this.attached.emit();
  }

  private _bindLoggerSignals() {
    const loggers = this._loggerRegistry.getLoggers();
    for (let logger of loggers) {
      if (this._loggersWatched.has(logger.source)) {
        continue;
      }

      logger.logChanged.connect((sender: ILogger, args: ILoggerChange) => {
        this._updateOutputAreas();
        this._showPlaceholderIfNoMessage();
      }, this);

      logger.rendermimeChanged.connect((sender: ILogger) => {
        const viewId = `source:${sender.source}`;
        const outputArea = this._outputAreas.get(viewId);
        if (outputArea) {
          outputArea.rendermime = sender.rendermime;
        }
      }, this);

      this._loggersWatched.add(logger.source);
    }
  }

  get loggerRegistry(): ILoggerRegistry {
    return this._loggerRegistry;
  }

  private _showOutputFromSource(source: string) {
    const viewId = `source:${source}`;

    this._outputAreas.forEach(
      (outputArea: LogConsoleOutputArea, name: string) => {
        if (outputArea.id === viewId) {
          outputArea.show();
          setTimeout(() => {
            this._scrollOuputAreaToBottom(outputArea);
          }, 50);
        } else {
          outputArea.hide();
        }
      }
    );

    const title = source ? `Log: ${source}` : 'Log Console';
    this.title.label = title;
    this.title.caption = title;
  }

  set activeSource(name: string) {
    this._activeSource = name;
    this._showOutputFromSource(this._activeSource);
    this._showPlaceholderIfNoMessage();
  }

  get activeSource(): string {
    return this._activeSource;
  }

  private _showPlaceholderIfNoMessage() {
    const noMessage =
      !this.activeSource ||
      this._loggerRegistry.getLogger(this.activeSource).length === 0;

    if (noMessage) {
      this._placeholder.show();
    } else {
      this._placeholder.hide();
    }
  }

  private _scrollOuputAreaToBottom(outputArea: LogConsoleOutputArea) {
    outputArea.node.scrollTo({
      left: 0,
      top: outputArea.node.scrollHeight,
      behavior: 'smooth'
    });
  }

  private _updateOutputAreas() {
    const loggerIds = new Set<string>();
    const loggers = this._loggerRegistry.getLoggers();

    for (let logger of loggers) {
      const viewId = `source:${logger.source}`;
      loggerIds.add(viewId);

      // add view for logger if not exist
      if (!this._outputAreas.has(viewId)) {
        const outputArea = new LogConsoleOutputArea({
          rendermime: logger.rendermime,
          contentFactory: new LogConsoleContentFactory(),
          model: logger.outputAreaModel
        });
        outputArea.id = viewId;
        outputArea.model.entryLimit = this.entryLimit;

        logger.logChanged.connect((sender: ILogger, args: ILoggerChange) => {
          this._scrollOuputAreaToBottom(outputArea);
        }, this);

        outputArea.outputLengthChanged.connect(
          (sender: LogConsoleOutputArea, args: number) => {
            outputArea.model.applyLimit();
            clearTimeout(this._scrollTimer);
            this._scrollTimer = setTimeout(() => {
              this._scrollOuputAreaToBottom(outputArea);
            }, 50);
          },
          this
        );

        this.addWidget(outputArea);
        this._outputAreas.set(viewId, outputArea);
      }
    }

    // remove views that do not have corresponding loggers anymore
    const viewIds = this._outputAreas.keys();

    for (let viewId of viewIds) {
      if (!loggerIds.has(viewId)) {
        const outputArea = this._outputAreas.get(viewId);
        outputArea.dispose();
        this._outputAreas.delete(viewId);
      }
    }
  }

  /**
   * Message entry limit.
   */
  get entryLimit(): number {
    return this._entryLimit;
  }

  /**
   * Sets message entry limit.
   */
  set entryLimit(limit: number) {
    if (limit > 0) {
      this._outputAreas.forEach((outputView: LogConsoleOutputArea) => {
        outputView.model.entryLimit = limit;
      });

      this._entryLimit = limit;
    }
  }

  readonly attached = new Signal<this, void>(this);
  private _loggerRegistry: ILoggerRegistry;
  private _outputAreas = new Map<string, LogConsoleOutputArea>();
  private _activeSource: string = null;
  private _entryLimit: number = DEFAULT_LOG_ENTRY_LIMIT;
  private _scrollTimer: number = null;
  private _placeholder: Widget;
  private _loggersWatched: Set<string> = new Set();
}
