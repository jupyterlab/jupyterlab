/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

/**
 * Layout restorer data structure used to store workspace layout configuration.
 */
export interface ILayoutRestorerData {
  main?: {
    dock?: {
      type?: string;
      currentIndex?: number;
      widgets?: unknown[];
    };
    current?: string;
  };
  down?: {
    size?: number;
    widgets?: unknown[];
  };
  left?: {
    collapsed?: boolean;
    visible?: boolean;
    current?: string;
    [key: string]: unknown;
  };
  right?: {
    collapsed?: boolean;
    visible?: boolean;
    current?: string;
    [key: string]: unknown;
  };
  top?: {
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
