// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@phosphor/coreutils';

import { ISignal } from '@phosphor/signaling';

import { nbformat } from '@jupyterlab/coreutils';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { IOutputAreaModel } from '@jupyterlab/outputarea';

/* tslint:disable */
/**
 * The Logger Registry token.
 */
export const ILoggerRegistry = new Token<ILoggerRegistry>(
  '@jupyterlab/logconsole:ILoggerRegistry'
);

export type ILoggerRegistryChange = 'append';

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
 * The base log payload type.
 */
export interface ILogPayloadBase {
  /**
   * Type of log data.
   */
  type: string;

  /**
   * Data
   */
  data: any;
}

/**
 * Plain text log payload.
 */
export interface ITextLog extends ILogPayloadBase {
  /**
   * Type of log data.
   */
  type: 'text';
  /**
   * Log data as plain text.
   */
  data: string;
}

/**
 * HTML log payload.
 */
export interface IHtmlLog extends ILogPayloadBase {
  /**
   * Type of log data.
   */
  type: 'html';
  /**
   * Log data as HTML string.
   */
  data: string;
}

/**
 * Notebook kernel output log payload.
 */
export interface IOutputLog extends ILogPayloadBase {
  /**
   * Type of log data.
   */
  type: 'output';
  /**
   * Log data as Notebook kernel output.
   */
  data: nbformat.IOutput;
}

/**
 * Log payload union type.
 */
export type ILogPayload = ITextLog | IHtmlLog | IOutputLog;

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
  log(log: ILogPayload): void;
  /**
   * Clear all outputs logged.
   */
  clear(): void;
  /**
   * Number of outputs logged.
   */
  readonly length: number;
  /**
   * Max number of messages.
   */
  maxLength: number;
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
  readonly outputAreaModel: IOutputAreaModel;
  /**
   * Whether the log has ever had a message.
   */
  readonly active: boolean;
}
