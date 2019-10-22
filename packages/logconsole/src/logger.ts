// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { nbformat } from '@jupyterlab/coreutils';

import { IOutputAreaModel, OutputAreaModel } from '@jupyterlab/outputarea';

import {
  IRenderMimeRegistry,
  IOutputModel,
  OutputModel
} from '@jupyterlab/rendermime';

import { ISignal, Signal } from '@phosphor/signaling';

import {
  ILogger,
  ILoggerChange,
  ILoggerOutputAreaModel,
  ILogPayload
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
export class LogOutputModel extends OutputModel {
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
 * Output Area Model implementation which is able to
 * limit number of outputs stored.
 */
export class LoggerOutputAreaModel extends OutputAreaModel
  implements ILoggerOutputAreaModel {
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
      // First, make sure our version reflects the new message so things
      // triggering from the signals below have the correct version.
      this._version++;

      // Next, trigger any displays of the message
      this.outputAreaModel.add({ ...output, timestamp: timestamp.valueOf() });

      // Finally, tell people that the message was appended (and possibly
      // already displayed).
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

  private _logChanged = new Signal<this, ILoggerChange>(this);
  private _rendermime: IRenderMimeRegistry | null = null;
  private _rendermimeChanged = new Signal<this, void>(this);
  private _version = 0;
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
