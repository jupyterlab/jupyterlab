// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { StackedPanel, Widget, Panel } from '@phosphor/widgets';

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

import {
  ILogger,
  ILoggerChange,
  ILogPayload,
  ILoggerRegistry,
  ILoggerRegistryChange
} from './tokens';

/**
 * Custom Notebook Output with timestamp member.
 */
interface ITimestampedOutput extends nbformat.IBaseOutput {
  /**
   * Date & time when output is logged in integer representation.
   */
  timestamp: number;
}

/**
 * Custom Notebook Output with optional timestamp.
 */
type IOutputWithTimestamp = nbformat.IOutput | ITimestampedOutput;

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
  constructor(options: Logger.IOptions) {
    this.source = options.source;
    this.outputAreaModel = new LoggerOutputAreaModel({
      contentFactory: new LogConsoleModelContentFactory(),
      maxLength: options.maxLength
    });
  }

  /**
   * The maximum number of outputs stored.
   *
   * #### Notes
   * Oldest entries will be trimmed to ensure the length is at most
   * `.maxLength`.
   */
  get maxLength() {
    return this.outputAreaModel.maxLength;
  }
  set maxLength(value: number) {
    this.outputAreaModel.maxLength = value;
  }

  /**
   * Number of outputs logged.
   */
  get length(): number {
    return this.outputAreaModel.length;
  }

  /**
   * A signal emitted when the list of log messages changes.
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
  log(log: ILogPayload) {
    const timestamp = new Date();
    let output: nbformat.IOutput = null;

    switch (log.type) {
      case 'text':
        output = {
          output_type: 'display_data',
          data: {
            'text/plain': log.data
          }
        };
        break;
      case 'html':
        output = {
          output_type: 'display_data',
          data: {
            'text/html': log.data
          }
        };
        break;
      case 'output':
        output = log.data;
        break;
      default:
        break;
    }

    if (output) {
      this.outputAreaModel.add({ ...output, timestamp: timestamp.valueOf() });
      this._active = true;
      this._logChanged.emit('append');
    }
  }

  /**
   * Clear all outputs logged.
   */
  clear() {
    this.outputAreaModel.clear(false);
    this._logChanged.emit('clear');
  }

  /**
   * Rendermime to use when rendering outputs logged.
   */
  get rendermime(): IRenderMimeRegistry | null {
    return this._rendermime;
  }
  set rendermime(value: IRenderMimeRegistry | null) {
    if (value !== this._rendermime) {
      this._rendermime = value;
      this._rendermimeChanged.emit();
    }
  }

  /**
   * Whether the log has ever had a message.
   */
  get active(): boolean {
    return this._active;
  }

  readonly source: string;
  readonly outputAreaModel: LoggerOutputAreaModel;
  private _logChanged = new Signal<this, ILoggerChange>(this);
  private _rendermimeChanged = new Signal<this, void>(this);
  private _rendermime: IRenderMimeRegistry | null = null;
  private _active = false;
}

export namespace Logger {
  export interface IOptions {
    /**
     * The log source identifier.
     */
    source: string;
    /**
     * The maximum number of messages to store.
     */
    maxLength: number;
  }
}

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
  constructor(options: LoggerRegistry.IOptions) {
    this._defaultRendermime = options.defaultRendermime;
    this._maxLength = options.maxLength;
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

    logger = new Logger({ source, maxLength: this.maxLength });
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

  /**
   * The max length for loggers.
   */
  get maxLength(): number {
    return this._maxLength;
  }
  set maxLength(value: number) {
    this._maxLength = value;
    this._loggers.forEach(logger => {
      logger.maxLength = value;
    });
  }

  private _maxLength: number;

  private _loggers = new Map<string, Logger>();
  private _registryChanged = new Signal<this, ILoggerRegistryChange>(this);
  private _defaultRendermime: IRenderMimeRegistry = null;
}

export namespace LoggerRegistry {
  export interface IOptions {
    defaultRendermime: IRenderMimeRegistry;
    maxLength: number;
  }
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
  constructor({ maxLength, ...options }: LoggerOutputAreaModel.IOptions) {
    super(options);
    this.maxLength = maxLength;
  }

  /**
   * Add an output, which may be combined with previous output.
   *
   * @returns The total number of outputs.
   *
   * #### Notes
   * The output bundle is copied. Contiguous stream outputs of the same `name`
   * are combined. The oldest outputs are possibly removed to ensure the total
   * number of outputs is at most `.maxLength`.
   */
  add(output: nbformat.IOutput): number {
    super.add(output);
    this._applyMaxLength();
    return this.length;
  }

  /**
   * Maximum number of outputs to store in the model.
   */
  set maxLength(value: number) {
    this._maxLength = value;
    this._applyMaxLength();
  }

  /**
   * Manually apply length limit.
   */
  private _applyMaxLength() {
    if (this.list.length > this._maxLength) {
      this.list.removeRange(0, this.list.length - this._maxLength);
    }
  }

  private _maxLength: number;
}

export namespace LoggerOutputAreaModel {
  export interface IOptions extends IOutputAreaModel.IOptions {
    /**
     * The maximum number of messages stored.
     */
    maxLength: number;
  }
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
    this.addWidget(this._placeholder);
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this._updateOutputAreas();
    this._showOutputFromSource(this._source);
    this._handlePlaceholder();
  }

  private _bindLoggerSignals() {
    const loggers = this._loggerRegistry.getLoggers();
    for (let logger of loggers) {
      if (this._loggersWatched.has(logger.source)) {
        continue;
      }

      logger.logChanged.connect((sender: ILogger, args: ILoggerChange) => {
        this._updateOutputAreas();
        this._handlePlaceholder();
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
            this._scrollOuputAreaToBottom(outputArea, false);
          }, 50);
        } else {
          outputArea.hide();
        }
      }
    );

    const title = source ? `Log: ${source}` : 'Log Console';
    this.title.label = title;
    this.title.caption = title;
    if (source !== null) {
      this._sourceDisplayed.emit(source);
    }
  }

  /**
   * The log source displayed
   */
  get source(): string | null {
    return this._source;
  }
  set source(source: string | null) {
    this._source = source;
    this._showOutputFromSource(this._source);
    this._handlePlaceholder();
    this._sourceChanged.emit(source);
  }

  /**
   * Signal for source changes
   */
  get sourceChanged(): ISignal<this, string | null> {
    return this._sourceChanged;
  }

  /**
   * Signal indicating all current messages for a source have been displayed.
   */
  get sourceDisplayed(): ISignal<this, string> {
    return this._sourceDisplayed;
  }

  private _handlePlaceholder() {
    if (this.source === null) {
      this._placeholder.node.textContent = 'No source selected.';
      this._placeholder.show();
    } else if (this._loggerRegistry.getLogger(this.source).length === 0) {
      this._placeholder.node.textContent = 'No log messages.';
      this._placeholder.show();
    } else {
      this._placeholder.hide();
      this._placeholder.node.textContent = '';
    }
  }

  private _scrollOuputAreaToBottom(
    outputArea: LogConsoleOutputArea,
    animate: boolean = true
  ) {
    outputArea.node.scrollTo({
      left: 0,
      top: outputArea.node.scrollHeight,
      behavior: animate ? 'smooth' : 'auto'
    });
  }

  private _updateOutputAreas() {
    const loggerIds = new Set<string>();
    const loggers = this._loggerRegistry.getLoggers();

    for (let logger of loggers) {
      const source = logger.source;
      const viewId = `source:${source}`;
      loggerIds.add(viewId);

      // add view for logger if not exist
      if (!this._outputAreas.has(viewId)) {
        const outputArea = new LogConsoleOutputArea({
          rendermime: logger.rendermime,
          contentFactory: new LogConsoleContentFactory(),
          model: logger.outputAreaModel
        });
        outputArea.id = viewId;

        logger.logChanged.connect((sender: ILogger, args: ILoggerChange) => {
          this._scrollOuputAreaToBottom(outputArea);
        }, this);

        outputArea.outputLengthChanged.connect(
          (sender: LogConsoleOutputArea, args: number) => {
            clearTimeout(this._scrollTimer);
            this._scrollTimer = setTimeout(() => {
              this._scrollOuputAreaToBottom(outputArea);
            }, 50);

            // Signal that we have displayed the current messages for this
            // source if it is currently displayed.
            if (source === this.source) {
              this._sourceDisplayed.emit(source);
            }
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

  private _loggerRegistry: ILoggerRegistry;
  private _outputAreas = new Map<string, LogConsoleOutputArea>();
  private _source: string | null = null;
  private _sourceChanged = new Signal<this, string | null>(this);
  private _sourceDisplayed = new Signal<this, string>(this);
  private _scrollTimer: number = null;
  private _placeholder: Widget;
  private _loggersWatched: Set<string> = new Set();
}
