/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';

import { MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import {
  IOutputLogRegistry,
  OutputLoggerView,
  OutputLogRegistry
} from '@jupyterlab/outputconsole';

import { KernelMessage } from '@jupyterlab/services';

import { nbformat } from '@jupyterlab/coreutils';

import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';

import React from 'react';

import {
  IStatusBar,
  GroupItem,
  IconItem,
  TextItem,
  interactiveItem
} from '@jupyterlab/statusbar';

/**
 * The Output Log extension.
 */
const outputLogPlugin: JupyterFrontEndPlugin<IOutputLogRegistry> = {
  activate: activateOutputLog,
  id: '@jupyterlab/outputconsole-extension:plugin',
  provides: IOutputLogRegistry,
  requires: [INotebookTracker, IStatusBar],
  optional: [ILayoutRestorer],
  autoStart: true
};

/*
 * A namespace for OutputStatusComponent.
 */
namespace OutputStatusComponent {
  /**
   * The props for the OutputStatusComponent.
   */
  export interface IProps {
    /**
     * A click handler for the item. By default
     * Output Console panel is launched.
     */
    handleClick: () => void;

    /**
     * Number of logs.
     */
    logCount: number;
  }
}

/**
 * A pure functional component for a Output Console status item.
 *
 * @param props - the props for the component.
 *
 * @returns a tsx component for rendering the Output Console logs.
 */
function OutputStatusComponent(
  props: OutputStatusComponent.IProps
): React.ReactElement<OutputStatusComponent.IProps> {
  return (
    <GroupItem
      spacing={0}
      onClick={props.handleClick}
      title={`${props.logCount} messages in Output Console`}
    >
      <IconItem source={'jp-StatusItem-output-console fa fa-list'} />
      <TextItem source={props.logCount} />
    </GroupItem>
  );
}

/**
 * A VDomRenderer widget for displaying the status of Output Console logs.
 */
export class OutputStatus extends VDomRenderer<OutputStatus.Model> {
  /**
   * Construct the output console status widget.
   */
  constructor(opts: OutputStatus.IOptions) {
    super();
    this._handleClick = opts.handleClick;
    this.model = new OutputStatus.Model(opts.outputLogRegistry);
    this.addClass(interactiveItem);
    this.addClass('outputconsole-status-item');

    // opts.outputLoggerView.madeVisible.connect(() => {
    //   this.removeClass('hilite');
    // });

    let timer: number = null;

    this.model.stateChanged.connect(() => {
      // if (opts.outputLoggerView.isAttached) {
      //   return;
      // }

      const wasHilited = this.hasClass('hilite');
      if (wasHilited) {
        this.removeClass('hilite');
        // cancel previous request
        clearTimeout(timer);
        timer = setTimeout(() => {
          this.addClass('hilite');
        }, 100);
      } else {
        this.addClass('hilite');
      }
    });
  }

  /**
   * Render the output console status item.
   */
  render() {
    const onClick = (): void => {
      this._handleClick();
    };

    if (this.model === null) {
      return null;
    } else {
      return (
        <OutputStatusComponent
          handleClick={onClick}
          logCount={this.model.logCount}
        />
      );
    }
  }

  private _handleClick: () => void;
}

/**
 * A namespace for Output Console log status.
 */
export namespace OutputStatus {
  /**
   * A VDomModel for the OutputStatus item.
   */
  export class Model extends VDomModel {
    /**
     * Create a new OutputStatus model.
     */
    constructor(outputLogRegistry: IOutputLogRegistry) {
      super();

      this._outputLogRegistry = outputLogRegistry;

      console.log(this._outputLogRegistry);

      // this._outputLogRegistry.logger.logChanged.connect(
      //   (sender: Logger, change: ILoggerChange) => {
      //     this.stateChanged.emit(void 0);
      //   }
      // );

      // this._outputLoggerView.logsCleared.connect(() => {
      //   this.stateChanged.emit(void 0);
      // });
    }

    get logCount(): number {
      return 0;
      //return this._outputLoggerView.logger.length;
    }

    private _outputLogRegistry: IOutputLogRegistry;
  }

  /**
   * Options for creating a new OutputStatus item
   */
  export interface IOptions {
    /**
     * Output Console widget which provides
     * Output Console interface and access to log info
     */
    outputLogRegistry: IOutputLogRegistry;

    /**
     * A click handler for the item. By default
     * Output Console panel is launched.
     */
    handleClick: () => void;
  }
}

/**
 * Activate the Output Log extension.
 */
function activateOutputLog(
  app: JupyterFrontEnd,
  nbtracker: INotebookTracker,
  statusBar: IStatusBar,
  restorer: ILayoutRestorer | null
): IOutputLogRegistry {
  const logRegistry = new OutputLogRegistry();

  //let command = 'outputconsole:open';

  let tracker = new WidgetTracker<MainAreaWidget<OutputLoggerView>>({
    namespace: 'outputlogger'
  });
  // if (restorer) {
  //   void restorer.restore(tracker, {
  //     command,
  //     args: obj => ({ source: obj.content.logger.source }),
  //     name: () => 'outputLogger'
  //   });
  // }

  let loggerWidget: MainAreaWidget<OutputLoggerView> = null;

  const createLoggerWidget = () => {
    let activeSource: string = nbtracker.currentWidget
      ? nbtracker.currentWidget.context.path
      : null;

    const loggerView = new OutputLoggerView(logRegistry);
    loggerWidget = new MainAreaWidget({ content: loggerView });
    loggerWidget.title.closable = true;
    loggerWidget.title.label = 'Output Console';
    loggerWidget.title.iconClass = 'fa fa-list lab-output-console-icon';

    app.shell.add(loggerWidget, 'main', {
      ref: '',
      mode: 'split-bottom'
    });
    void tracker.add(loggerWidget);
    loggerWidget.update();

    app.shell.activateById(loggerWidget.id);

    if (activeSource) {
      loggerView.showOutputFromSource(activeSource);
    }

    loggerWidget.disposed.connect(() => {
      loggerWidget = null;
    });
  };

  const status = new OutputStatus({
    outputLogRegistry: logRegistry,
    handleClick: () => {
      if (!loggerWidget) {
        createLoggerWidget();
      } else {
        loggerWidget.activate();
      }
    }
  });

  statusBar.registerStatusItem('@jupyterlab/outputconsole-extension:status', {
    item: status,
    align: 'left',
    isActive: () => true,
    activeStateChanged: status.model!.stateChanged
  });

  //// TEST ///////
  nbtracker.widgetAdded.connect(
    (sender: INotebookTracker, nb: NotebookPanel) => {
      //const logger = logRegistry.getLogger(nb.context.path);

      nb.context.session.iopubMessage.connect(
        (_, msg: KernelMessage.IIOPubMessage) => {
          if (
            KernelMessage.isDisplayDataMsg(msg) ||
            KernelMessage.isStreamMsg(msg) ||
            KernelMessage.isErrorMsg(msg)
          ) {
            const logger = logRegistry.getLogger(nb.context.path);
            logger.rendermime = nb.content.rendermime;
            logger.log((msg.content as unknown) as nbformat.IOutput);
          }
        }
      );

      nb.activated.connect((nb: NotebookPanel, args: void) => {
        if (loggerWidget) {
          loggerWidget.content.showOutputFromSource(nb.context.path);
        }
      });
    }
  );
  /////////////

  return logRegistry;
  // The notebook can call this command.
  // When is the output model disposed?
}

export default [outputLogPlugin];
