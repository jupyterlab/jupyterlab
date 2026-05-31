// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';
import { Logger } from './logger';
import type {
  ILogger,
  ILoggerRegistry,
  ILoggerRegistryChange,
  LogLevel
} from './tokens';

/**
 * A concrete implementation of ILoggerRegistry.
 */
export class LoggerRegistry implements ILoggerRegistry {
  /**
   * Construct a LoggerRegistry.
   *
   * @param options.defaultRendermime - Default rendermime to render outputs
   * with when logger is not supplied with one.
   */
  constructor(options: LoggerRegistry.IOptions) {
    this._defaultRendermime = options.defaultRendermime;
    this._maxLength = options.maxLength;
    this._defaultLogLevel = options.defaultLogLevel ?? 'warning';
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

    logger = new Logger({
      source,
      maxLength: this.maxLength,
      level: this.defaultLogLevel
    });
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

  /**
   * The default log level for new loggers.
   * The new value will be applied to new loggers only.
   */
  get defaultLogLevel(): LogLevel {
    return this._defaultLogLevel;
  }
  set defaultLogLevel(value: LogLevel) {
    this._defaultLogLevel = value;
  }

  /**
   * Whether the register is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose the registry and all loggers.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._loggers.forEach(x => x.dispose());
    Signal.clearData(this);
  }

  private _defaultRendermime: IRenderMimeRegistry;
  private _loggers = new Map<string, ILogger>();
  private _maxLength: number;
  private _defaultLogLevel: LogLevel;
  private _registryChanged = new Signal<this, ILoggerRegistryChange>(this);
  private _isDisposed = false;
}

/**
 * The namespace for LoggerRegistry class statics.
 */
export namespace LoggerRegistry {
  /**
   * The options used to initialize a LoggerRegistry.
   */
  export interface IOptions {
    /**
     * The default rendermime to render outputs with when logger is not
     * supplied with one.
     */
    defaultRendermime: IRenderMimeRegistry;
    /**
     * The maximum length of the log messages.
     */
    maxLength: number;
    /**
     * The default log level for the loggers.
     */
    defaultLogLevel?: LogLevel;
  }
}
