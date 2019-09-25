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
 * The Logger Registry token.
 */
export const ILoggerRegistry = new Token<ILoggerRegistry>(
  '@jupyterlab/logconsole:ILoggerRegistry'
);

/**
 * A Logger Registry that registers and provides loggers by source.
 */
export interface ILoggerRegistry {
  /**
   * Get the logger for the specified source.
   *
   * @param source - The name of the log source.
   *
   * @returns The logger for the specified source.
   */
  getLogger(source: string): ILogger;
  /**
   * Get all loggers registered.
   *
   * @returns The array containing all registered loggers.
   */
  getLoggers(): ILogger[];

  /**
   * A signal emitted when the logger registry changes.
   */
  readonly registryChanged: ISignal<this, ILoggerRegistryChange>;
}

/**
 * Custom Notebook Output with timestamp member.
 */
interface ITimestampedOutput extends nbformat.IBaseOutput {
  /**
   * Date & time when output is logged in integer representation.
   */
  timestamp: number;
}

export const DEFAULT_LOG_ENTRY_LIMIT: number = 1000;

/**
 * Custom Notebook Output with optional timestamp.
 */
type IOutputWithTimestamp = nbformat.IOutput | ITimestampedOutput;

export type ILoggerChange = 'append' | 'clear';

/**
 * A Logger that manages logs from a particular source.
 */
export interface ILogger {
  /**
   * Log an output to logger.
   *
   * @param log - The output to be logged.
   */
  log(log: nbformat.IOutput): void;
  /**
   * Clear all outputs logged.
   */
  clear(): void;
  /**
   * Number of outputs logged.
   */
  readonly length: number;
  /**
   * Rendermime to use when rendering outputs logged.
   */
  rendermime: IRenderMimeRegistry;
  /**
   * A signal emitted when the log model changes.
   */
  readonly logChanged: ISignal<this, ILoggerChange>;
  /**
   * A signal emitted when the rendermime changes.
   */
  readonly rendermimeChanged: ISignal<this, void>;
  /**
   * The name of the log source.
   */
  readonly source: string;
  /**
   * Output Area Model used to manage log storage in memory.
   */
  readonly outputAreaModel: LoggerOutputAreaModel;
}

/**
 * Log Output Model with timestamp which provides
 * item information for Output Area Model.
 */
class LogOutputModel extends OutputModel {
  /**
   * Construct a LogOutputModel.
   *
   * @param options - The model initialization options.
   */
  constructor(options: LogOutputModel.IOptions) {
    super(options);

    this.timestamp = new Date(options.value.timestamp as number);
  }

  /**
   * Date & time when output is logged.
   */
  timestamp: Date = null;
}

/**
 * Log Output Model namespace that defines initialization options.
 */
namespace LogOutputModel {
  export interface IOptions extends IOutputModel.IOptions {
    value: IOutputWithTimestamp;
  }
}

/**
 * Implementation of `IContentFactory` for Output Area Model
 * which creates LogOutputModel instances.
 */
class LogConsoleModelContentFactory extends OutputAreaModel.ContentFactory {
  /**
   * Create a rendermime output model from notebook output.
   */
  createOutputModel(options: IOutputModel.IOptions): LogOutputModel {
    return new LogOutputModel(options);
  }
}

/**
 * A concrete implementation of ILogger.
 */
export class Logger implements ILogger {
  /**
   * Construct a Logger.
   *
   * @param source - The name of the log source.
   */
  constructor(source: string) {
    this.source = source;
  }

  /**
   * Number of outputs logged.
   */
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

  /**
   * Log an output to logger.
   *
   * @param log - The output to be logged.
   */
  log(log: nbformat.IOutput) {
    const timestamp = new Date();
    this.outputAreaModel.add({ ...log, timestamp: timestamp.valueOf() });
    this._logChanged.emit('append');
  }

  /**
   * Clear all outputs logged.
   */
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

  /**
   * Rendermime to use when rendering outputs logged.
   */
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

/**
 * A concrete implementation of ILoggerRegistry.
 */
export class LoggerRegistry implements ILoggerRegistry {
  /**
   * Construct a LoggerRegistry.
   *
   * @param defaultRendermime - Default rendermime to render outputs
   * with when logger is not supplied with one.
   */
  constructor(defaultRendermime: IRenderMimeRegistry) {
    this._defaultRendermime = defaultRendermime;
  }

  /**
   * Get the logger for the specified source.
   *
   * @param source - The name of the log source.
   *
   * @returns The logger for the specified source.
   */
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

  /**
   * Get all loggers registered.
   *
   * @returns The array containing all registered loggers.
   */
  getLoggers(): ILogger[] {
    return Array.from(this._loggers.values());
  }

  /**
   * A signal emitted when the logger registry changes.
   */
  get registryChanged(): ISignal<this, ILoggerRegistryChange> {
    return this._registryChanged;
  }

  private _loggers = new Map<string, Logger>();
  private _registryChanged = new Signal<this, ILoggerRegistryChange>(this);
  private _defaultRendermime: IRenderMimeRegistry = null;
}

/**
 * Log console output prompt implementation
 */
class LogConsoleOutputPrompt extends Widget implements IOutputPrompt {
  constructor() {
    super();

    this._timestampNode = document.createElement('div');
    this.node.append(this._timestampNode);
  }

  /**
   * Date & time when output is logged.
   */
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
 * Output Area implementation displaying log outputs
 * with prompts showing log timestamps.
 */
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
  /**
   * Output area model used by the widget.
   */
  readonly model: LoggerOutputAreaModel;
}

/**
 * Output Area Model implementation which is able to
 * limit number of outputs stored.
 */
class LoggerOutputAreaModel extends OutputAreaModel {
  constructor(options?: IOutputAreaModel.IOptions) {
    super(options);
  }

  /**
   * Maximum number of log entries to store in the model.
   */
  set entryLimit(limit: number) {
    this._entryLimit = limit;
    this.applyLimit();
  }

  /**
   * Manually apply entry limit.
   */
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
 * Implementation of `IContentFactory` for Output Area
 * which creates custom output prompts.
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
 * A StackedPanel implementation that creates Output Areas
 * for each log source and activates as source is switched.
 */
export class LogConsolePanel extends StackedPanel {
  /**
   * Construct a LogConsolePanel instance.
   *
   * @param loggerRegistry - The logger registry that provides
   * logs to be displayed.
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
    this._placeholder.addClass('jp-LogConsoleListPlaceholder');
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

  /**
   * The logger registry providing the logs.
   */
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

  /**
   * The name of the active log source
   */
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

    // remove output areas that do not have corresponding loggers anymore
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
   * Log output entry limit.
   */
  get entryLimit(): number {
    return this._entryLimit;
  }

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
