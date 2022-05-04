import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import { ILSPCodeExtractorsManager } from '../tokens';

import { IForeignCodeExtractor, IForeignCodeExtractorsRegistry } from './types';

export class CodeExtractorsManager implements ILSPCodeExtractorsManager {
  registry: IForeignCodeExtractorsRegistry;

  constructor() {
    this.registry = {};
  }

  /**
   * Register an extractor to extract foreign code from host documents of specified language.
   */
  register(extractor: IForeignCodeExtractor, host_language: string): void {
    if (!this.registry.hasOwnProperty(host_language)) {
      this.registry[host_language] = [];
    }
    this.registry[host_language].push(extractor);
  }
}

export const CODE_EXTRACTORS_MANAGER: JupyterFrontEndPlugin<ILSPCodeExtractorsManager> =
  {
    id: ILSPCodeExtractorsManager.name,
    requires: [],
    activate: app => {
      return new CodeExtractorsManager();
    },
    provides: ILSPCodeExtractorsManager,
    autoStart: true
  };
