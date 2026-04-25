/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import type { ISettingRegistry } from '@jupyterlab/settingregistry';

/**
 * Schema for code optimizer settings.
 */
export const SCHEMA: ISettingRegistry.ISchema = {
  type: 'object',
  title: 'Code Optimizer',
  description: 'Settings for code optimizer',
  properties: {
    enableAutoOptimize: {
      type: 'boolean',
      title: 'Enable automatic optimization',
      description: 'Automatically optimize code before execution',
      default: false
    },
    enableImportOptimization: {
      type: 'boolean',
      title: 'Enable import optimization',
      description: 'Sort and clean import statements',
      default: true
    },
    enableSimplification: {
      type: 'boolean',
      title: 'Enable code simplification',
      description: 'Fold constants and simplify expressions',
      default: true
    },
    enableComplexityReduction: {
      type: 'boolean',
      title: 'Enable complexity reduction',
      description: 'Extract repeated patterns',
      default: true
    },
    enableReusability: {
      type: 'boolean',
      title: 'Enable reusability improvements',
      description: 'Extract common patterns into functions',
      default: true
    }
  }
};

/**
 * Default settings for code optimizer.
 */
export const DEFAULT_SETTINGS = {
  enableAutoOptimize: false,
  enableImportOptimization: true,
  enableSimplification: true,
  enableComplexityReduction: true,
  enableReusability: true
};
