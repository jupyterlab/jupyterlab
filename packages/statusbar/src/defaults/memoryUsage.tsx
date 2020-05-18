// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React from 'react';

import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';

import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

import { Poll } from '@lumino/polling';

import { TextItem } from '..';

import { nbresuse } from '../style/text';

/**
 * A VDomRenderer for showing memory usage by a kernel.
 */
export class MemoryUsage extends VDomRenderer<MemoryUsage.Model> {
  /**
   * Construct a new memory usage status item.
   */
  constructor() {
    super(new MemoryUsage.Model({ refreshRate: 5000 }));
  }

  /**
   * Render the memory usage status item.
   */
  render() {
    if (!this.model) {
      return null;
    }
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
    if (!this.model.usageWarning) {
      return <TextItem title="Current mem usage" source={text} />;
    } else {
      return (
        <TextItem
          title="Current mem usage"
          source={text}
          className={nbresuse}
        />
      );
    }
  }
}

/**
 * A namespace for MemoryUsage statics.
 */
export namespace MemoryUsage {
  /**
   * A VDomModel for the memory usage status item.
   */
  export class Model extends VDomModel {
    /**
     * Construct a new memory usage model.
     *
     * @param options: the options for creating the model.
     */
    constructor(options: Model.IOptions) {
      super();
      this._poll = new Poll<Private.IMetricRequestResult | null>({
        factory: () => Private.factory(),
        frequency: {
          interval: options.refreshRate,
          backoff: true
        },
        name: '@jupyterlab/statusbar:MemoryUsage#metrics'
      });
      this._poll.ticked.connect(poll => {
        const { payload, phase } = poll.state;
        if (phase === 'resolved') {
          this._updateMetricsValues(payload);
          return;
        }
        if (phase === 'rejected') {
          const oldMetricsAvailable = this._metricsAvailable;
          this._metricsAvailable = false;
          this._currentMemory = 0;
          this._memoryLimit = null;
          this._units = 'B';

          if (oldMetricsAvailable) {
            this.stateChanged.emit();
          }
          return;
        }
      });
    }

    /**
     * Whether the metrics server extension is available.
     */
    get metricsAvailable(): boolean {
      return this._metricsAvailable;
    }

    /**
     * The current memory usage/
     */
    get currentMemory(): number {
      return this._currentMemory;
    }

    /**
     * The current memory limit, or null if not specified.
     */
    get memoryLimit(): number | null {
      return this._memoryLimit;
    }

    /**
     * The units for memory usages and limits.
     */
    get units(): MemoryUnit {
      return this._units;
    }

    /**
     * The warning for memory usage.
     */
    get usageWarning(): boolean {
      return this._warn;
    }

    /**
     * Dispose of the memory usage model.
     */
    dispose(): void {
      super.dispose();
      this._poll.dispose();
    }

    /**
     * Given the results of the metrics request, update model values.
     */
    private _updateMetricsValues(
      value: Private.IMetricRequestResult | null
    ): void {
      const oldMetricsAvailable = this._metricsAvailable;
      const oldCurrentMemory = this._currentMemory;
      const oldMemoryLimit = this._memoryLimit;
      const oldUnits = this._units;
      const oldUsageWarning = this._warn;

      if (value === null) {
        this._metricsAvailable = false;
        this._currentMemory = 0;
        this._memoryLimit = null;
        this._units = 'B';
        this._warn = false;
      } else {
        const numBytes = value.rss;
        const memoryLimit = value.limits.memory
          ? value.limits.memory.rss
          : null;
        const [currentMemory, units] = Private.convertToLargestUnit(numBytes);
        const usageWarning = value.limits.memory
          ? value.limits.memory.warn
          : false;

        this._metricsAvailable = true;
        this._currentMemory = currentMemory;
        this._units = units;
        this._memoryLimit = memoryLimit
          ? memoryLimit / Private.MEMORY_UNIT_LIMITS[units]
          : null;
        this._warn = usageWarning;
      }

      if (
        this._currentMemory !== oldCurrentMemory ||
        this._units !== oldUnits ||
        this._memoryLimit !== oldMemoryLimit ||
        this._metricsAvailable !== oldMetricsAvailable ||
        this._warn !== oldUsageWarning
      ) {
        this.stateChanged.emit(void 0);
      }
    }

    private _currentMemory: number = 0;
    private _memoryLimit: number | null = null;
    private _metricsAvailable: boolean = false;
    private _poll: Poll<Private.IMetricRequestResult | null>;
    private _units: MemoryUnit = 'B';
    private _warn: boolean = false;
  }

  /**
   * A namespace for Model statics.
   */
  export namespace Model {
    /**
     * Options for creating a MemoryUsage model.
     */
    export interface IOptions {
      /**
       * The refresh rate (in ms) for querying the server.
       */
      refreshRate: number;
    }
  }

  /**
   * The type of unit used for reporting memory usage.
   */
  export type MemoryUnit = 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB';
}

/**
 * A namespace for module private statics.
 */
namespace Private {
  /**
   * The number of decimal places to use when rendering memory usage.
   */
  export const DECIMAL_PLACES = 2;

  /**
   * The number of bytes in each memory unit.
   */
  export const MEMORY_UNIT_LIMITS: {
    readonly [U in MemoryUsage.MemoryUnit]: number;
  } = {
    B: 1,
    KB: 1024,
    MB: 1048576,
    GB: 1073741824,
    TB: 1099511627776,
    PB: 1125899906842624
  };

  /**
   * Given a number of bytes, convert to the most human-readable
   * format, (GB, TB, etc).
   */
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

  /**
   * Settings for making requests to the server.
   */
  const SERVER_CONNECTION_SETTINGS = ServerConnection.makeSettings();

  /**
   * The url endpoint for making requests to the server.
   */
  const METRIC_URL = URLExt.join(SERVER_CONNECTION_SETTINGS.baseUrl, 'metrics');

  /**
   * The shape of a response from the metrics server extension.
   */
  export interface IMetricRequestResult {
    rss: number;
    limits: {
      memory?: {
        rss: number;
        warn: boolean;
      };
    };
  }

  /**
   * Make a request to the backend.
   */
  export async function factory(): Promise<IMetricRequestResult | null> {
    const request = ServerConnection.makeRequest(
      METRIC_URL,
      {},
      SERVER_CONNECTION_SETTINGS
    );
    const response = await request;

    if (response.ok) {
      return await response.json();
    }

    return null;
  }
}
