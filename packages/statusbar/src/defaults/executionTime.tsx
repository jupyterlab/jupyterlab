// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISessionContext, VDomModel, VDomRenderer } from '@jupyterlab/apputils';

import {
  ITranslator,
  nullTranslator
  //TranslationBundle
} from '@jupyterlab/translation';
import React from 'react';
import { interactiveItem, TextItem } from '..';
import { Status } from '@jupyterlab/services/src/kernel/messages';

/**
 * A react functional component for rendering execution time.
 */
function ExecutionTimeComponent(
  props: ExecutionTimeComponent.IProps
): React.ReactElement<ExecutionTimeComponent.IProps> {
  const translator = props.translator || nullTranslator;
  const time = props.time || 0;
  const scheduledCellNumber = props.scheduledCellNumber || 0;
  const remainingCellNumber = props.remainingCellNumber || 0;
  const trans = translator.load('jupyterlab');
  if (props.status === 'busy') {
    return (
      <TextItem
        title={''}
        source={trans.__(
          `${
            scheduledCellNumber - remainingCellNumber
          }/${scheduledCellNumber} cells executed | Total: ${time} seconds `
        )}
      />
    );
  } else {
    if (time === 0) {
      return <TextItem title={''} source={trans.__(``)} />;
    } else {
      return (
        <TextItem
          title={''}
          source={trans.__(`Finished after ${time} seconds`)}
        />
      );
    }
  }
}

/**
 * A namespace for ExecutionTimeComponent statics.
 */
namespace ExecutionTimeComponent {
  /**
   * Props for the kernel status component.
   */
  export interface IProps {
    /**
     * The application language translator.
     */
    translator?: ITranslator;

    status?: string;

    time?: number;

    scheduledCellNumber?: number;

    remainingCellNumber?: number;
  }
}

/**
 * A VDomRenderer widget for displaying the status of a kernel.
 */
export class ExecutionTime extends VDomRenderer<ExecutionTime.Model> {
  /**
   * Construct the kernel status widget.
   */
  constructor(opts: ExecutionTime.IOptions, translator?: ITranslator) {
    super(new ExecutionTime.Model(translator));
    this.translator = translator || nullTranslator;
    this.addClass(interactiveItem);
  }

  /**
   * Render the kernel status item.
   */
  render(): JSX.Element | null {
    if (this.model === null) {
      return null;
    } else {
      return (
        <ExecutionTimeComponent
          translator={this.translator}
          status={this.model.status}
          time={this.model.time}
          scheduledCellNumber={this.model.scheduledCellNumber}
          remainingCellNumber={this.model.remainingCellNumber}
        />
      );
    }
  }

  translator: ITranslator;
}

/**
 * A namespace for ExecutionTime statics.
 */
export namespace ExecutionTime {
  /**
   * A VDomModel for the kernel status indicator.
   */
  export class Model extends VDomModel {
    constructor(translator?: ITranslator) {
      super();
      translator = translator || nullTranslator;
      //   this._trans = translator.load('jupyterlab');
      this._tick = this._tick.bind(this);
      this._resetTime = this._resetTime.bind(this);
    }

    attachSessionContext(sessionContext: ISessionContext | null): void {
      if (sessionContext) {
        this._currentSessionContext = sessionContext;
        if (!this._notebookExecutionProgress.has(sessionContext)) {
          this._notebookExecutionProgress.set(sessionContext, {
            kernelStatus: '',
            totalTime: 0,
            interval: 0,
            timeout: 0,
            scheduledCell: new Set<Private.Cell>(),
            scheduledCellNumber: 0
          });
          sessionContext.statusChanged.connect(this._onKernelStatusChanged, this);
        }
      }
    }

    private get _currentData(): Private.ExecutionState | undefined {
      return this._notebookExecutionProgress.get(this._currentSessionContext);
    }
    /**
     * The current status of the kernel.
     */
    get status(): string | undefined {
      console.log('getting status', this._currentData?.kernelStatus);

      return this._currentData?.kernelStatus;
    }

    // get sessionContext(): ISessionContext | null {
    //   return this._sessionContext;
    // }
    // set sessionContext(sessionContext: ISessionContext | null) {
    //   this._sessionContext = sessionContext;
    //   this._sessionContext?.statusChanged.connect(
    //     this._onKernelStatusChanged,
    //     this
    //   );
    // }

    get time(): number | undefined {
      return this._currentData?.totalTime;
    }

    get scheduledCellNumber(): number | undefined {
      return this._currentData?.scheduledCellNumber;
    }

    get remainingCellNumber(): number | undefined {
      return this._currentData?.scheduledCell.size;
    }

    public cellExecutedCallback = (
      context: ISessionContext,
      cell: Private.Cell
    ): void => {
      const state = this._notebookExecutionProgress.get(context);
      if (state) {
        state.scheduledCell.delete(cell);
      }
    };

    public cellScheduledCallback = (
      context: ISessionContext,
      cell: Private.Cell
    ): void => {
      const state = this._notebookExecutionProgress.get(context);
      if (state) {
        state.scheduledCell.add(cell);
        state.scheduledCellNumber += 1;
      }
    };

    private _tick(data: Private.ExecutionState): void {
      data.totalTime += 1;
      this.stateChanged.emit(void 0);
    }

    private _resetTime(data: Private.ExecutionState): void {
      data.totalTime = 0;
      data.scheduledCellNumber = 0;
    }

    private _onKernelStatusChanged = (
      ctx: ISessionContext,
      newStatus: Status
    ) => {
      const progressData = this._notebookExecutionProgress.get(ctx);
      if (progressData) {
        progressData.kernelStatus = newStatus;
        if (newStatus === 'busy') {
          clearTimeout(progressData.timeout);
          progressData.interval = setInterval(() => {
            this._tick(progressData);
          }, 1000);
        } else if (newStatus === 'idle') {
          clearInterval(progressData.interval);
          progressData.timeout = setTimeout(() => {
            this._resetTime(progressData);
          }, 1000);
          this.stateChanged.emit(void 0);
        }
      }
      // const newStatus = this._sessionContext?.kernelDisplayStatus;
      // if (this._kernelStatus !== newStatus) {
      //   this._kernelStatus = newStatus;
      //   if (newStatus === 'busy') {
      //     clearTimeout(this._timeOut);
      //     this._currentCellTime = 0;
      //     this._interval = setInterval(this._tick, 1000);
      //   } else if (newStatus === 'idle') {
      //     clearInterval(this._interval);
      //     this._timeOut = setTimeout(this._resetTime, 1000);
      //     this.stateChanged.emit(void 0);
      //   }
      // }
    };

    // private _trans: TranslationBundle;
    private _currentSessionContext: ISessionContext;
    private _notebookExecutionProgress = new WeakMap<
      ISessionContext,
      Private.ExecutionState
    >();
  }

  /**
   * Options for creating a ExecutionTime object.
   */
  export interface IOptions {}
}

namespace Private {
  export type ExecutionState = {
    kernelStatus: string;
    totalTime: number;
    interval: number;
    timeout: number;
    scheduledCell: Set<Cell>;
    scheduledCellNumber: number;
  };
  export type Cell = any;
}
