// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as nbformat from '@jupyterlab/nbformat';
import { IOutputAreaModel, OutputAreaModel } from '@jupyterlab/outputarea';
import {
  IOutputModel,
  IRenderMimeRegistry,
  OutputModel
} from '@jupyterlab/rendermime';
import { ISignal, Signal } from '@lumino/signaling';
import {
  IContentChange,
  ILogger,
  ILoggerOutputAreaModel,
  ILogPayload,
  IStateChange,
  LogLevel
} from './tokens';

/**
 * All severity levels, including an internal one for metadata.
 */
type FullLogLevel = LogLevel | 'metadata';

/**
 * Custom Notebook Output with log info.
 */
type ILogOutput = nbformat.IOutput & {
  /**
   * Date & time when output is logged in integer representation.
   */
  timestamp: number;

  /**
   * Log level
   */
  level: FullLogLevel;
};

export interface ILogOutputModel extends IOutputModel {
  /**
   * Date & time when output is logged.
   */
  readonly timestamp: Date;

  /**
   * Log level
   */
  readonly level: FullLogLevel;
}

/**
 * Log Output Model with timestamp which provides
 * item information for Output Area Model.
 */
export class LogOutputModel extends OutputModel implements ILogOutputModel {
  /**
   * Construct a LogOutputModel.
   *
   * @param options - The model initialization options.
   */
  constructor(options: LogOutputModel.IOptions) {
    super(options);

    this.timestamp = new Date(options.value.timestamp);
    this.level = options.value.level;
  }

  /**
   * Date & time when output is logged.
   */
  readonly timestamp: Date;

  /**
   * Log level
   */
  readonly level: FullLogLevel;
}

/**
 * Log Output Model namespace that defines initialization options.
 */
namespace LogOutputModel {
  export interface IOptions extends IOutputModel.IOptions {
    value: ILogOutput;
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
  createOutputModel(options: LogOutputModel.IOptions): LogOutputModel {
    return new LogOutputModel(options);
  }
}

/**
 * Output Area Model implementation which is able to
 * limit number of outputs stored.
 */
export class LoggerOutputAreaModel
  extends OutputAreaModel
  implements ILoggerOutputAreaModel
{
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
  add(output: ILogOutput): number {
    super.add(output);
    this._applyMaxLength();
    return this.length;
  }

  /**
   * Whether an output should combine with the previous output.
   *
   * We combine if the two outputs are in the same second, which is the
   * resolution for our time display.
   */
  protected shouldCombine(options: {
    value: ILogOutput;
    lastModel: ILogOutputModel;
  }): boolean {
    const { value, lastModel } = options;

    const oldSeconds = Math.trunc(lastModel.timestamp.getTime() / 1000);
    const newSeconds = Math.trunc(value.timestamp / 1000);

    return oldSeconds === newSeconds;
  }

  /**
   * Get an item at the specified index.
   */
  get(index: number): ILogOutputModel {
    return super.get(index) as ILogOutputModel;
  }

  /**
   * Maximum number of outputs to store in the model.
   */
  get maxLength(): number {
    return this._maxLength;
  }
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
 * A concrete implementation of ILogger.
 */
export class Logger implements ILogger {
  /**
   * Construct a Logger.
   *
   * @param options Constructor options
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
  get maxLength(): number {
    return this.outputAreaModel.maxLength;
  }
  set maxLength(value: number) {
    this.outputAreaModel.maxLength = value;
  }

  /**
   * The level of outputs logged
   */
  get level(): LogLevel {
    return this._level;
  }
  set level(newValue: LogLevel) {
    const oldValue = this._level;
    if (oldValue === newValue) {
      return;
    }
    this._level = newValue;
    this._log({
      output: {
        output_type: 'display_data',
        data: {
          'text/plain': `Log level set to ${newValue}`
        }
      },
      level: 'metadata'
    });
    this._stateChanged.emit({ name: 'level', oldValue, newValue });
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
  get contentChanged(): ISignal<this, IContentChange> {
    return this._contentChanged;
  }

  /**
   * A signal emitted when the log state changes.
   */
  get stateChanged(): ISignal<this, IStateChange> {
    return this._stateChanged;
  }

  /**
   * Rendermime to use when rendering outputs logged.
   */
  get rendermime(): IRenderMimeRegistry | null {
    return this._rendermime;
  }
  set rendermime(value: IRenderMimeRegistry | null) {
    if (value !== this._rendermime) {
      const oldValue = this._rendermime;
      const newValue = (this._rendermime = value);
      this._stateChanged.emit({ name: 'rendermime', oldValue, newValue });
    }
  }

  /**
   * The number of messages that have ever been stored.
   */
  get version(): number {
    return this._version;
  }

  /**
   * The source for the logger.
   */
  readonly source: string;

  /**
   * The output area model used for the logger.
   *
   * #### Notes
   * This will usually not be accessed directly. It is a public attribute so
   * that the renderer can access it.
   */
  readonly outputAreaModel: LoggerOutputAreaModel;

  /**
   * Log an output to logger.
   *
   * @param log - The output to be logged.
   */
  log(log: ILogPayload): void {
    // Filter by our current log level
    if (
      Private.LogLevel[log.level as keyof typeof Private.LogLevel] <
      Private.LogLevel[this._level as keyof typeof Private.LogLevel]
    ) {
      return;
    }
    let output: nbformat.IOutput | null = null;
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
      this._log({
        output,
        level: log.level
      });
    }
  }

  /**
   * Clear all outputs logged.
   */
  clear(): void {
    this.outputAreaModel.clear(false);
    this._contentChanged.emit('clear');
  }

  /**
   * Add a checkpoint to the log.
   */
  checkpoint(): void {
    this._log({
      output: {
        output_type: 'display_data',
        data: {
          'text/html': '<hr/>'
        }
      },
      level: 'metadata'
    });
  }

  /**
   * Whether the logger is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose the logger.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.clear();
    this._rendermime = null!;
    Signal.clearData(this);
  }

  private _log(options: { output: nbformat.IOutput; level: FullLogLevel }) {
    // First, make sure our version reflects the new message so things
    // triggering from the signals below have the correct version.
    this._version++;

    // Next, trigger any displays of the message
    this.outputAreaModel.add({
      ...options.output,
      timestamp: Date.now(),
      level: options.level
    });

    // Finally, tell people that the message was appended (and possibly
    // already displayed).
    this._contentChanged.emit('append');
  }

  private _isDisposed = false;
  private _contentChanged = new Signal<this, IContentChange>(this);
  private _stateChanged = new Signal<this, IStateChange>(this);
  private _rendermime: IRenderMimeRegistry | null = null;
  private _version = 0;
  private _level: LogLevel = 'warning';
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

namespace Private {
  export enum LogLevel {
    debug,
    info,
    warning,
    error,
    critical,
    metadata
  }
}
