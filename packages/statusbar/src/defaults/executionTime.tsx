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

/**
 * A react functional component for rendering execution time.
 */
function ExecutionTimeComponent(
  props: ExecutionTimeComponent.IProps
): React.ReactElement<ExecutionTimeComponent.IProps> {
  const translator = props.translator || nullTranslator;
  const time = props.time || { total: 0, current: 0 };
  const trans = translator.load('jupyterlab');
  if (props.status === 'busy') {
    return (
      <TextItem
        title={''}
        source={trans.__(
          `Current cell: ${time.current} seconds | Total: ${time.total} seconds `
        )}
      />
    );
  } else {
    if (time.total === 0) {
      return <TextItem title={''} source={trans.__(``)} />;
    } else {
      return (
        <TextItem
          title={''}
          source={trans.__(`Finished after ${time.total} seconds`)}
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

    time?: { total: number; current: number };
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

    /**
     * The current status of the kernel.
     */
    get status(): string | undefined {
      return this._kernelStatus;
    }

    get sessionContext(): ISessionContext | null {
      return this._sessionContext;
    }
    set sessionContext(sessionContext: ISessionContext | null) {
      this._sessionContext = sessionContext;
      this._sessionContext?.statusChanged.connect(
        this._onKernelStatusChanged,
        this
      );
    }

    get time(): { total: number; current: number } {
      return { total: this._totalTime, current: this._currentCellTime };
    }

    private _tick(): void {
      this._totalTime += 1;
      this._currentCellTime += 1;
      this.stateChanged.emit(void 0);
    }

    private _resetTime(): void {
      this._totalTime = 0;
      this._currentCellTime = 0;
    }

    private _onKernelStatusChanged = () => {
      const newStatus = this._sessionContext?.kernelDisplayStatus;
      if (this._kernelStatus !== newStatus) {
        this._kernelStatus = newStatus;
        if (newStatus === 'busy') {
          clearTimeout(this._timeOut);
          this._currentCellTime = 0;
          this._interval = setInterval(this._tick, 1000);
        } else if (newStatus === 'idle') {
          clearInterval(this._interval);
          this._timeOut = setTimeout(this._resetTime, 1000);
          this.stateChanged.emit(void 0);
        }
      }
    };

    // private _trans: TranslationBundle;
    private _sessionContext: ISessionContext | null = null;
    private _kernelStatus: string | undefined = '';
    private _totalTime: number = 0;
    private _currentCellTime: number = 0;
    private _interval: number;
    private _timeOut: number;
  }

  /**
   * Options for creating a ExecutionTime object.
   */
  export interface IOptions {}
}
