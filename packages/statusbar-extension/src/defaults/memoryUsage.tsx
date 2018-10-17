/**
 * Default item to display the memory usage of the current process.
 */
/**
 * Part of Jupyterlab status bar defaults.
 */
import React from 'react';
import { ISignal } from '@phosphor/signaling';
import { IDisposable } from '@phosphor/disposable';
import { Token } from '@phosphor/coreutils';
import { JupyterLabPlugin, JupyterLab } from '@jupyterlab/application';
import { IDefaultsManager } from './manager';
import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';
import { ServerConnection } from '@jupyterlab/services';
import { URLExt } from '@jupyterlab/coreutils';
import { TextItem } from '../component';

class MemoryUsage extends VDomRenderer<MemoryUsage.Model>
  implements IMemoryUsage {
  constructor() {
    super();

    this.model = new MemoryUsage.Model({
      refreshRate: 5000
    });
  }

  render() {
    if (this.model === null) {
      return null;
    } else {
      let text: string;
      if (this.model.memoryLimit === null) {
        text = `Mem: ${this.model.currentMemory.toFixed(
          Private.DECIMAL_PLACES
        )} ${this.model.units}`;
      } else {
        text = `Mem: ${this.model.currentMemory.toFixed(
          Private.DECIMAL_PLACES
        )} / ${this.model.memoryLimit.toFixed(Private.DECIMAL_PLACES)} ${
          this.model.units
        }`;
      }
      return <TextItem title="Current memory usage" source={text} />;
    }
  }
}

namespace MemoryUsage {
  export class Model extends VDomModel implements IMemoryUsage.IModel {
    constructor({ refreshRate }: { refreshRate: number }) {
      super();

      this._refreshRate = refreshRate;

      this._intervalId = setInterval(this._makeMetricRequest, refreshRate);
    }

    get metricsAvailable() {
      return this._metricsAvailable;
    }

    get currentMemory() {
      return this._currentMemory;
    }

    get memoryLimit() {
      return this._memoryLimit;
    }

    get units() {
      return this._units;
    }

    dispose() {
      super.dispose();

      clearInterval(this._intervalId);
    }

    private _makeMetricRequest = () => {
      const requestResult = Private.makeMetricsRequest();

      requestResult
        .then(response => {
          if (response.ok) {
            try {
              return response.json();
            } catch (err) {
              return null;
            }
          } else {
            return null;
          }
        })
        .then(this._updateMetricsValues)
        .catch(err => {
          const oldMetricsAvailable = this._metricsAvailable;
          this._metricsAvailable = false;
          this._currentMemory = 0;
          this._memoryLimit = null;
          this._units = 'B';
          clearInterval(this._intervalId);

          if (oldMetricsAvailable) {
            this.stateChanged.emit(void 0);
          }
        });
    };

    private _updateMetricsValues = (
      value: Private.MetricRequestResult | null
    ) => {
      const oldMetricsAvailable = this._metricsAvailable;
      const oldCurrentMemory = this._currentMemory;
      const oldMemoryLimit = this._memoryLimit;
      const oldUnits = this._units;

      if (value === null) {
        this._metricsAvailable = false;
        this._currentMemory = 0;
        this._memoryLimit = null;
        this._units = 'B';

        clearInterval(this._intervalId);
      } else {
        const numBytes = value.rss;
        const memoryLimit = value.limits.memory
          ? value.limits.memory.rss
          : null;
        const [currentMemory, units] = Private.convertToLargestUnit(numBytes);

        this._metricsAvailable = true;
        this._currentMemory = currentMemory;
        this._units = units;
        this._memoryLimit = memoryLimit
          ? memoryLimit / Private.MEMORY_UNIT_LIMITS[units]
          : null;

        if (!oldMetricsAvailable) {
          this._intervalId = setInterval(
            this._makeMetricRequest,
            this._refreshRate
          );
        }
      }

      if (
        this._currentMemory !== oldCurrentMemory ||
        this._units !== oldUnits ||
        this._memoryLimit !== oldMemoryLimit ||
        this._metricsAvailable !== oldMetricsAvailable
      ) {
        this.stateChanged.emit(void 0);
      }
    };

    private _metricsAvailable: boolean = false;
    private _currentMemory: number = 0;
    private _memoryLimit: number | null = null;
    private _units: MemoryUnit = 'B';
    private _intervalId: any;
    private _refreshRate: number;
  }

  export type MemoryUnit = 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB';
}

export interface IMemoryUsage extends IDisposable {
  readonly model: IMemoryUsage.IModel | null;
  readonly modelChanged: ISignal<this, void>;
}

export namespace IMemoryUsage {
  export interface IModel {
    readonly metricsAvailable: boolean;
    readonly currentMemory: number;
    readonly memoryLimit: number | null;
    readonly units: string;
  }
}

namespace Private {
  export const DECIMAL_PLACES = 2;

  export const MEMORY_UNIT_LIMITS: {
    readonly [U in MemoryUsage.MemoryUnit]: number
  } = {
    B: 0,
    KB: 1024,
    MB: 1048576,
    GB: 1073741824,
    TB: 1099511627776,
    PB: 1125899906842624
  };

  export function convertToLargestUnit(
    numBytes: number
  ): [number, MemoryUsage.MemoryUnit] {
    if (numBytes < MEMORY_UNIT_LIMITS.KB) {
      return [numBytes, 'B'];
    } else if (
      MEMORY_UNIT_LIMITS.KB === numBytes ||
      numBytes < MEMORY_UNIT_LIMITS.MB
    ) {
      return [numBytes / MEMORY_UNIT_LIMITS.KB, 'KB'];
    } else if (
      MEMORY_UNIT_LIMITS.MB === numBytes ||
      numBytes < MEMORY_UNIT_LIMITS.GB
    ) {
      return [numBytes / MEMORY_UNIT_LIMITS.MB, 'MB'];
    } else if (
      MEMORY_UNIT_LIMITS.GB === numBytes ||
      numBytes < MEMORY_UNIT_LIMITS.TB
    ) {
      return [numBytes / MEMORY_UNIT_LIMITS.GB, 'GB'];
    } else if (
      MEMORY_UNIT_LIMITS.TB === numBytes ||
      numBytes < MEMORY_UNIT_LIMITS.PB
    ) {
      return [numBytes / MEMORY_UNIT_LIMITS.TB, 'TB'];
    } else {
      return [numBytes / MEMORY_UNIT_LIMITS.PB, 'PB'];
    }
  }

  const SERVER_CONNECTION_SETTINGS = ServerConnection.makeSettings();
  const METRIC_URL = URLExt.join(SERVER_CONNECTION_SETTINGS.baseUrl, 'metrics');

  export type MetricRequestResult = {
    rss: number;
    limits: {
      memory?: {
        rss: number;
        warn?: number;
      };
    };
  };

  export function makeMetricsRequest(): Promise<Response> {
    const request = ServerConnection.makeRequest(
      METRIC_URL,
      {},
      SERVER_CONNECTION_SETTINGS
    );

    return request;
  }
}

// tslint:disable-next-line:variable-name
export const IMemoryUsage = new Token<IMemoryUsage>(
  '@jupyterlab/statusbar:IMemoryUsage'
);

export const memoryUsageItem: JupyterLabPlugin<IMemoryUsage> = {
  id: '@jupyterlab/statusbar:memory-usage-item',
  autoStart: true,
  provides: IMemoryUsage,
  requires: [IDefaultsManager],
  activate: (app: JupyterLab, defaultsManager: IDefaultsManager) => {
    let item = new MemoryUsage();

    defaultsManager.addDefaultStatus('memory-usage-item', item, {
      align: 'left',
      priority: 2,
      isActive: () => item.model!.metricsAvailable,
      stateChanged: item.model!.stateChanged
    });

    return item;
  }
};
