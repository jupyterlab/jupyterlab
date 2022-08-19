/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

// Type definitions for vega-statistics
// Project: vega-statistics
// Definitions by: Jupyter Development Team

declare module 'vega-statistics' {
  export function quartiles(
    array: number[],
    accessor?: (t: any) => number
  ): [number, number, number];
}
