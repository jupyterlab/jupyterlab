/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Widget, BoxLayout } from '@phosphor/widgets';

import { UUID, Token } from '@phosphor/coreutils';

import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';

import { nbformat } from '@jupyterlab/coreutils';

import { OutputArea, OutputAreaModel } from '@jupyterlab/outputarea';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

export const IOutputConsole = new Token<IOutputConsole>(
  '@jupyterlab/outputconsole:IOutputConsole'
);

export interface IOutputConsole {
  logMessage(sender: string, msg: any): void;
}

export class OutputConsole implements IOutputConsole {
  logMessage(sender: string, msg: any) {
    if (this._onMessageHandler) {
      this._onMessageHandler(sender, msg);
    } else {
      console.log(`IOutputConsole: ${msg}`);
    }
  }

  onMessage(handler: any) {
    this._onMessageHandler = handler;
  }

  private _onMessageHandler: any;
}

export class OutputConsoleWidget extends Widget {
  constructor(rendermime: IRenderMimeRegistry) {
    super();

    this.id = UUID.uuid4();
    this.title.closable = true;
    this.title.label = 'Output Console';
    this.addClass('lab-output-console-widget');

    this._consoleView = new OutputConsoleView(rendermime);
    this._consoleView.update();
    this._consoleView.activate();

    let toolbar = new Toolbar();
    let button = new ToolbarButton({
      onClick: (): void => {
        this._consoleView.clearMessages();
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

  get outputConsole(): IOutputConsole {
    return this._consoleView.outputConsole;
  }

  private _consoleView: OutputConsoleView = null;
}

class OutputConsoleView extends Widget {
  constructor(rendermime: IRenderMimeRegistry) {
    super();

    this.node.style.overflowY = 'auto'; // TODO: use CSS class

    this._outputConsole = new OutputConsole();

    this._outputConsole.onMessage((sender: string, msg: any) => {
      if (
        ![
          'execute_result',
          'display_data',
          'stream',
          'error',
          'update_display_data'
        ].includes(msg.header.msg_type)
      ) {
        return;
      }

      const output = msg.content as nbformat.IOutput;
      output.output_type = msg.header.msg_type as nbformat.OutputType;

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
            <div class="log-count">${++this._logCounter})</div>
            <div class="log-time">${logTime}</div>
          </div>
          <div class="log-sender" title="${sender}">${sender}</div>
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
    });
  }

  get outputConsole(): IOutputConsole {
    return this._outputConsole;
  }

  clearMessages(): void {
    while (this.node.lastChild) {
      this.node.removeChild(this.node.lastChild);
    }
    this._logCounter = 0;
  }

  private _logCounter: number = 0;
  private _outputConsole: OutputConsole = null;
}
