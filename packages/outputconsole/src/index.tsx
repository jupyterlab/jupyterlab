/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Panel } from '@phosphor/widgets';

import { Token } from '@phosphor/coreutils';

import { ISignal, Signal } from '@phosphor/signaling';

import { nbformat } from '@jupyterlab/coreutils';

import {
  OutputArea,
  OutputAreaModel,
  SimplifiedOutputArea
} from '@jupyterlab/outputarea';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { IDisposable, DisposableDelegate } from '@phosphor/disposable';

/* tslint:disable */
/**
 * The Output Logger token.
 */
export const IOutputLogRegistry = new Token<IOutputLogRegistry>(
  '@jupyterlab/outputconsole:IOutputLogRegistry'
);

export interface IOutputLogRegistry {
  createLogger(options: IOutputLogRegistry.IRegisterOptions): IDisposable;
  getLogger(name: string): ILogger;
}

export namespace IOutputLogRegistry {
  export interface IRegisterOptions {
    name: string;
    rendermime: IRenderMimeRegistry;
  }
}

export interface ILogger {
  log(output: nbformat.IOutput): void;
  clear(): void;
  readonly length: number;

  /**
   * A signal emitted when the log changes.
   */
  readonly logChanged: ISignal<this, ILoggerChange>;
  readonly source: string;
  readonly rendermime: IRenderMimeRegistry;
  readonly outputAreaModel: OutputAreaModel;
}

export class Logger implements ILogger {
  constructor(source: string, rendermime: IRenderMimeRegistry) {
    this.source = source;
    this.rendermime = rendermime;
  }

  get length(): number {
    return this._count;
  }

  /**
   * A signal emitted when the model of the notebook changes.
   */
  get logChanged(): ISignal<this, ILoggerChange> {
    return this._logChanged;
  }

  log(output: nbformat.IOutput) {
    this.outputAreaModel.add(output);
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
  readonly outputAreaModel = new OutputAreaModel();
  readonly rendermime: IRenderMimeRegistry;
}

export type ILoggerChange = 'append' | 'clear';

export class OutputLogRegistry implements IOutputLogRegistry {
  createLogger({
    name,
    rendermime
  }: IOutputLogRegistry.IRegisterOptions): IDisposable {
    if (this._logs.has(name)) {
      throw new Error(
        `Output log registry already has a logger for source name ${name}`
      );
    }
    this._logs.set(name, new Logger(name, rendermime));
    return new DisposableDelegate(() => {
      this._logs.delete(name);
    });
  }

  getLogger(name: string): ILogger {
    return this._logs.get(name);
  }

  _logs = new Map<string, Logger>();
}

/**
 * A List View widget that shows Output Console logs.
 */
export class OutputLoggerView extends Panel {
  /**
   * Construct an OutputConsoleView instance.
   */
  constructor(logger: ILogger) {
    super();

    this.title.closable = true;
    this.title.label = 'Output Console';
    this.title.iconClass = 'fa fa-list lab-output-console-icon';

    this._logger = logger;
    this.node.style.overflowY = 'auto'; // TODO: use CSS class

    this._outputView = new SimplifiedOutputArea({
      rendermime: this._logger.rendermime,
      contentFactory: OutputArea.defaultContentFactory,
      model: logger.outputAreaModel
    });

    this.addWidget(this._outputView);
  }

  get logger(): ILogger {
    return this._logger;
  }

  private _logger: ILogger;
  private _outputView: OutputArea;
}
