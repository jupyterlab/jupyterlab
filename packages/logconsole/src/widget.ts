// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { nbformat } from '@jupyterlab/coreutils';

import { OutputArea, IOutputPrompt } from '@jupyterlab/outputarea';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { Kernel, KernelMessage } from '@jupyterlab/services';

import { Message } from '@phosphor/messaging';

import { ISignal, Signal } from '@phosphor/signaling';

import { StackedPanel, Widget, Panel } from '@phosphor/widgets';

import { LogOutputModel, LoggerOutputAreaModel } from './logger';

import {
  ILogger,
  ILoggerChange,
  ILoggerRegistry,
  ILoggerRegistryChange
} from './tokens';

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
            this._scrollOutputAreaToBottom(outputArea, false);
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

  /**
   * The log source displayed
   */
  get source(): string | null {
    return this._source;
  }
  set source(name: string | null) {
    this._source = name;
    this._showOutputFromSource(this._source);
    this._handlePlaceholder();
    this._sourceChanged.emit(name);
  }

  /**
   * Signal for source changes
   */
  get sourceChanged(): ISignal<this, string | null> {
    return this._sourceChanged;
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

  private _scrollOutputAreaToBottom(
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

        logger.logChanged.connect((sender: ILogger, args: ILoggerChange) => {
          this._scrollOutputAreaToBottom(outputArea);
        }, this);

        outputArea.outputLengthChanged.connect(
          (sender: LogConsoleOutputArea, args: number) => {
            clearTimeout(this._scrollTimer);
            this._scrollTimer = setTimeout(() => {
              this._scrollOutputAreaToBottom(outputArea);
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

  private _loggerRegistry: ILoggerRegistry;
  private _outputAreas = new Map<string, LogConsoleOutputArea>();
  private _source: string | null = null;
  private _sourceChanged = new Signal<this, string | null>(this);
  private _scrollTimer: number = null;
  private _placeholder: Widget;
  private _loggersWatched: Set<string> = new Set();
}
