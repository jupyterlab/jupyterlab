/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Widget, BoxLayout } from '@phosphor/widgets';

import { UUID, Token } from '@phosphor/coreutils';

import { ISignal, Signal } from '@phosphor/signaling';

import { Message } from '@phosphor/messaging';

import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';

import { nbformat } from '@jupyterlab/coreutils';

import { OutputArea, OutputAreaModel } from '@jupyterlab/outputarea';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { KernelMessage } from '@jupyterlab/services';

export const IOutputConsole = new Token<IOutputConsole>(
  '@jupyterlab/outputconsole:IOutputConsole'
);

export interface IOutputLogPayload {
  sourceName?: string;
  sourceIconClassName?: string;
  msg: KernelMessage.IIOPubMessage;
}

export interface IOutputConsole {
  logMessage(payload: IOutputLogPayload): void;
  onLogMessage: ISignal<IOutputConsole, IOutputLogPayload>;
  logCount: number;
}

export class OutputConsole implements IOutputConsole {
  logMessage(payload: IOutputLogPayload) {
    this._logCount++;
    this._onLogMessage.emit(payload);
  }

  get onLogMessage(): ISignal<IOutputConsole, IOutputLogPayload> {
    return this._onLogMessage;
  }

  get logCount(): number {
    return this._logCount;
  }

  clearMessages(): void {
    this._logCount = 0;
  }

  private _onLogMessage = new Signal<IOutputConsole, IOutputLogPayload>(this);
  private _logCount: number = 0;
}

export class OutputConsoleWidget extends Widget {
  constructor(rendermime: IRenderMimeRegistry) {
    super();

    this.id = UUID.uuid4();
    this.title.closable = true;
    this.title.label = 'Output Console';
    this.title.iconClass = 'fa fa-list lab-output-console-icon';
    this.addClass('lab-output-console-widget');

    this._consoleView = new OutputConsoleView(rendermime);
    this._consoleView.update();
    this._consoleView.activate();

    let toolbar = new Toolbar();
    let button = new ToolbarButton({
      onClick: (): void => {
        this._consoleView.clearMessages();
        this._logsCleared.emit();
      },
      iconClassName: 'fa fa-ban clear-icon',
      tooltip: 'Clear',
      label: 'Clear'
    });
    toolbar.addItem(name, button);
    toolbar.addItem('lab-output-console-clear', button);

    let layout = new BoxLayout();
    layout.addWidget(toolbar);
    layout.addWidget(this._consoleView);

    BoxLayout.setStretch(toolbar, 0);
    BoxLayout.setStretch(this._consoleView, 1);

    this.layout = layout;
  }

  onAfterAttach(msg: Message) {
    this._madeVisible.emit();
  }

  get outputConsole(): IOutputConsole {
    return this._consoleView.outputConsole;
  }

  get logsCleared(): ISignal<this, void> {
    return this._logsCleared;
  }

  get madeVisible(): ISignal<this, void> {
    return this._madeVisible;
  }

  private _consoleView: OutputConsoleView = null;
  private _logsCleared = new Signal<this, void>(this);
  private _madeVisible = new Signal<this, void>(this);
}

class OutputConsoleView extends Widget {
  constructor(rendermime: IRenderMimeRegistry) {
    super();

    this.node.style.overflowY = 'auto'; // TODO: use CSS class

    this._outputConsole = new OutputConsole();

    this._outputConsole.onLogMessage.connect(
      (sender: OutputConsole, payload: IOutputLogPayload) => {
        const output = payload.msg.content as nbformat.IOutput;
        output.output_type = payload.msg.header.msg_type as nbformat.OutputType;

        const outputView = new OutputArea({
          rendermime: rendermime,
          contentFactory: OutputArea.defaultContentFactory,
          model: new OutputAreaModel()
        });

        outputView.update();

        const now = new Date();
        const logTime = now.toLocaleTimeString();
        const logLine = document.createElement('div');
        logLine.className = 'lab-output-console-line';
        logLine.innerHTML = `
        <div class="log-meta">
          <div class="log-count-time">
            <div class="log-count">${this._outputConsole.logCount})</div>
            <div class="log-time">${logTime}</div>
          </div>
          <div class="log-sender" title="${payload.sourceName}">
            <div class="log-sender-icon ${
              payload.sourceIconClassName ? payload.sourceIconClassName : ''
            }"></div>
            ${payload.sourceName}
          </div>
        </div>
        <div class="log-content"></div>`;

        this.node.appendChild(logLine);

        logLine.querySelector('.log-content').appendChild(outputView.node);

        outputView.model.add(output);

        this.node.scrollTo({
          left: 0,
          top: this.node.scrollHeight,
          behavior: 'smooth'
        });
      }
    );
  }

  get outputConsole(): IOutputConsole {
    return this._outputConsole;
  }

  get logCount(): number {
    return this._outputConsole.logCount;
  }

  clearMessages(): void {
    while (this.node.lastChild) {
      this.node.removeChild(this.node.lastChild);
    }

    return this._outputConsole.clearMessages();
  }

  private _outputConsole: OutputConsole = null;
}
